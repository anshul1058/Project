/**
 * Recommendation Engine for StudyPlatform
 * Provides personalized material recommendations using:
 * - Collaborative filtering (similar users' downloads)
 * - Content-based filtering (materials with similar metadata)
 */

/**
 * Get personalized recommendations for the current user
 * @param {number} limit - Number of recommendations to return (default: 6)
 * @returns {Promise<Array>} Array of recommended materials
 */
export async function getRecommendations(limit = 6) {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        
        if (!user) {
            // Return trending materials for anonymous users
            return getTrendingMaterials(limit);
        }

        // Get user's download history
        const userDownloads = await getUserDownloadHistory(user.id);
        
        if (userDownloads.length === 0) {
            // If user hasn't downloaded anything, return trending materials
            return getTrendingMaterials(limit);
        }

        // Get collaborative recommendations (materials liked by similar users)
        const collaborativeRecs = await getCollaborativeRecommendations(user.id, userDownloads, limit);
        
        // Get content-based recommendations (materials similar to user's preferences)
        const contentBasedRecs = await getContentBasedRecommendations(userDownloads, limit);
        
        // Merge and deduplicate recommendations
        return mergeRecommendations(collaborativeRecs, contentBasedRecs, limit);
        
    } catch (error) {
        console.error('Recommendation error:', error);
        // Fallback to trending materials
        return getTrendingMaterials(limit);
    }
}

/**
 * Get user's download history
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of downloaded material objects
 */
async function getUserDownloadHistory(userId) {
    try {
        const { data, error } = await window.supabase
            .from('downloads')
            .select(`
                material_id,
                materials(id, branch, semester, subject, category, avg_rating)
            `)
            .eq('user_id', userId)
            .order('downloaded_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        
        return data
            .map(d => d.materials)
            .filter(m => m !== null);
            
    } catch (error) {
        console.error('Error fetching download history:', error);
        return [];
    }
}

/**
 * Get collaborative recommendations based on similar users' behavior
 * Users who downloaded similar materials might like other materials
 * @param {string} userId - Current user ID
 * @param {Array} userDownloads - User's download history
 * @param {number} limit - Number of recommendations
 * @returns {Promise<Array>} Recommended materials
 */
async function getCollaborativeRecommendations(userId, userDownloads, limit) {
    try {
        // Get material IDs user has already downloaded
        const downloadedIds = userDownloads.map(d => d.id);
        
        // Find users who downloaded similar materials
        const { data: similarUserDownloads } = await window.supabase
            .from('downloads')
            .select(`
                user_id,
                materials(id, title, branch, semester, subject, category, avg_rating, uploader_id, created_at, downloads:downloads(count))
            `)
            .in('material_id', downloadedIds)
            .neq('user_id', userId)
            .limit(100);

        if (!similarUserDownloads || similarUserDownloads.length === 0) {
            return [];
        }

        // Extract materials from similar users, excluding user's already downloaded
        const recommendedMaterialIds = new Map();
        
        similarUserDownloads.forEach(download => {
            const material = download.materials;
            if (material && !downloadedIds.includes(material.id)) {
                if (!recommendedMaterialIds.has(material.id)) {
                    recommendedMaterialIds.set(material.id, {
                        ...material,
                        score: 0,
                        reason: 'Users similar to you downloaded this'
                    });
                }
                // Increment score for each similar user who downloaded it
                recommendedMaterialIds.get(material.id).score += 1;
            }
        });

        // Sort by score and rating
        const sorted = Array.from(recommendedMaterialIds.values())
            .sort((a, b) => {
                const scoreWeight = b.score - a.score;
                const ratingWeight = (b.avg_rating || 0) - (a.avg_rating || 0);
                return scoreWeight * 2 + ratingWeight; // Emphasize score over rating
            })
            .slice(0, limit);

        return sorted;

    } catch (error) {
        console.error('Error in collaborative recommendations:', error);
        return [];
    }
}

/**
 * Get content-based recommendations based on user's download preferences
 * @param {Array} userDownloads - User's download history
 * @param {number} limit - Number of recommendations
 * @returns {Promise<Array>} Recommended materials
 */
async function getContentBasedRecommendations(userDownloads, limit) {
    try {
        // Analyze user preferences from download history
        const preferences = analyzeUserPreferences(userDownloads);
        
        // Find materials matching user's preferences
        const recommendations = new Map();
        
        for (const [key, value] of Object.entries(preferences)) {
            if (value.count > 0) {
                // Search for materials matching this preference
                const topValues = value.items.slice(0, 2);
                
                for (const item of topValues) {
                    const { data: materials } = await window.supabase
                        .from('materials')
                        .select(`
                            id, 
                            title, 
                            branch, 
                            semester, 
                            subject, 
                            category, 
                            avg_rating, 
                            uploader_id, 
                            created_at
                        `)
                        .eq(key, item)
                        .order('avg_rating', { ascending: false })
                        .limit(10);

                    if (materials) {
                        materials.forEach(material => {
                            const downloadedIds = userDownloads.map(d => d.id);
                            
                            if (!downloadedIds.includes(material.id)) {
                                if (!recommendations.has(material.id)) {
                                    recommendations.set(material.id, {
                                        ...material,
                                        score: 0,
                                        reason: `Related to ${key}: ${item}`
                                    });
                                }
                                recommendations.get(material.id).score += 10;
                            }
                        });
                    }
                }
            }
        }

        // Sort by score and rating
        return Array.from(recommendations.values())
            .sort((a, b) => {
                const scoreWeight = b.score - a.score;
                const ratingWeight = (b.avg_rating || 0) - (a.avg_rating || 0);
                return scoreWeight + ratingWeight;
            })
            .slice(0, limit);

    } catch (error) {
        console.error('Error in content-based recommendations:', error);
        return [];
    }
}

/**
 * Analyze user preferences from their download history
 * Returns most frequent branch, semester, subject, and category
 * @param {Array} userDownloads - User's downloaded materials
 * @returns {Object} User preference analysis
 */
function analyzeUserPreferences(userDownloads) {
    const preferences = {
        branch: { items: [], count: 0 },
        semester: { items: [], count: 0 },
        subject: { items: [], count: 0 },
        category: { items: [], count: 0 }
    };

    const counters = {
        branch: new Map(),
        semester: new Map(),
        subject: new Map(),
        category: new Map()
    };

    // Count occurrences of each attribute
    userDownloads.forEach(material => {
        ['branch', 'semester', 'subject', 'category'].forEach(key => {
            const value = material[key];
            if (value) {
                counters[key].set(value, (counters[key].get(value) || 0) + 1);
            }
        });
    });

    // Get top items for each attribute
    Object.keys(preferences).forEach(key => {
        const sorted = Array.from(counters[key].entries())
            .sort((a, b) => b[1] - a[1])
            .map(([value, count]) => value);
        
        preferences[key].items = sorted;
        preferences[key].count = sorted.length;
    });

    return preferences;
}

/**
 * Get trending materials (for new or anonymous users)
 * @param {number} limit - Number of materials to return
 * @returns {Promise<Array>} Trending materials
 */
export async function getTrendingMaterials(limit = 6) {
    try {
        const { data, error } = await window.supabase
            .from('materials')
            .select(`
                id,
                title,
                branch,
                semester,
                subject,
                category,
                avg_rating,
                uploader_id,
                created_at,
                downloads:downloads(count)
            `)
            .order('avg_rating', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];

    } catch (error) {
        console.error('Error fetching trending materials:', error);
        return [];
    }
}

/**
 * Merge collaborative and content-based recommendations
 * Removes duplicates and returns top recommendations
 * @param {Array} collaborativeRecs - Recommendations from collaborative filtering
 * @param {Array} contentBasedRecs - Recommendations from content-based filtering
 * @param {number} limit - Total number of recommendations
 * @returns {Array} Merged and deduplicated recommendations
 */
function mergeRecommendations(collaborativeRecs, contentBasedRecs, limit) {
    const merged = new Map();

    // Collaborative recommendations get higher weight
    collaborativeRecs.forEach(material => {
        merged.set(material.id, {
            ...material,
            weight: (material.score || 0) * 2,
            reason: material.reason
        });
    });

    // Content-based recommendations (might override with higher score)
    contentBasedRecs.forEach(material => {
        const weight = material.score || 0;
        if (!merged.has(material.id) || weight > merged.get(material.id).weight) {
            merged.set(material.id, {
                ...material,
                weight,
                reason: material.reason
            });
        }
    });

    // Sort by weight and rating, return top results
    return Array.from(merged.values())
        .sort((a, b) => {
            const weightDiff = b.weight - a.weight;
            const ratingDiff = (b.avg_rating || 0) - (a.avg_rating || 0);
            return weightDiff + ratingDiff * 0.5;
        })
        .slice(0, limit)
        .map(({ weight, ...material }) => material); // Remove weight from final result
}

/**
 * Get personalized recommendations efficiently with caching
 * Use with caution - implements simple in-memory cache
 * @param {number} limit - Number of recommendations
 * @returns {Promise<Array>} Recommended materials
 */
let recommendationCache = null;
let cacheTimeout = null;

export async function getRecommendationsWithCache(limit = 6) {
    // Return cached recommendations if available
    if (recommendationCache) {
        return recommendationCache;
    }

    // Fetch fresh recommendations
    const recommendations = await getRecommendations(limit);
    recommendationCache = recommendations;

    // Clear cache after 5 minutes
    clearTimeout(cacheTimeout);
    cacheTimeout = setTimeout(() => {
        recommendationCache = null;
    }, 5 * 60 * 1000);

    return recommendations;
}

/**
 * Clear the recommendation cache (useful after user actions)
 */
export function clearRecommendationCache() {
    recommendationCache = null;
    clearTimeout(cacheTimeout);
}
