-- ═══════════ Vidyasetu.notes Database Schema ═══════════
-- Run this in Supabase Dashboard → SQL Editor or via CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════ ENUMS ═══════════
CREATE TYPE user_role AS ENUM ('student', 'contributor', 'admin');
CREATE TYPE material_category AS ENUM ('notes', 'pyqs', 'assignments', 'books', 'presentations', 'other');
CREATE TYPE branch_type AS ENUM ('computer_science', 'mechanical', 'electrical', 'electronics', 'civil', 'entc', 'it', 'mathematics', 'physics', 'chemistry', 'humanities');

-- ═══════════ TABLES ═══════════

-- Extend auth.users with profile data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'student',
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials (study resources)
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    stream TEXT,
    branch branch_type,
    autonomous_status TEXT,
    university TEXT,
    college TEXT,
    semester INTEGER CHECK (semester BETWEEN 1 AND 8),
    subject TEXT NOT NULL,
    category material_category NOT NULL,
    downloads INTEGER DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews & Ratings
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, user_id)
);

-- Study Groups
CREATE TABLE public.study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    branch branch_type,
    subject TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Members
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group Messages
CREATE TABLE public.group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Downloads tracking
CREATE TABLE public.downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, user_id)
);

-- Bookmarks/Saved materials
CREATE TABLE public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(material_id, user_id)
);

-- ═══════════ INDEXES ═══════════
CREATE INDEX idx_materials_branch ON public.materials(branch);
CREATE INDEX idx_materials_semester ON public.materials(semester);
CREATE INDEX idx_materials_subject ON public.materials(subject);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_uploader ON public.materials(uploader_id);
CREATE INDEX idx_materials_created ON public.materials(created_at DESC);
CREATE INDEX idx_materials_popularity ON public.materials(downloads DESC, avg_rating DESC);

CREATE INDEX idx_reviews_material ON public.reviews(material_id);
CREATE INDEX idx_reviews_user ON public.reviews(user_id);

CREATE INDEX idx_study_groups_branch ON public.study_groups(branch);
CREATE INDEX idx_study_groups_subject ON public.study_groups(subject);

CREATE INDEX idx_group_messages_group ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created ON public.group_messages(created_at DESC);

-- ═══════════ ROW LEVEL SECURITY (RLS) ═══════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Materials: all can read, authenticated can insert, uploader can update
CREATE POLICY "Materials are viewable by all" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload materials" ON public.materials FOR INSERT
    WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can update their materials" ON public.materials FOR UPDATE
    USING (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can delete their materials" ON public.materials FOR DELETE
    USING (auth.uid() = uploader_id);

-- Reviews: all can read, authenticated can insert/update own
CREATE POLICY "Reviews are viewable by all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can review" ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE
    USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE
    USING (auth.uid() = user_id);

-- Study Groups: public groups viewable, members can read, creator can manage
CREATE POLICY "Public groups are viewable" ON public.study_groups FOR SELECT
    USING (is_public = true OR EXISTS (
        SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid()
    ));
CREATE POLICY "Authenticated users can create groups" ON public.study_groups FOR INSERT
    WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creator can update" ON public.study_groups FOR UPDATE
    USING (auth.uid() = created_by);

-- Group Members: members can read, users can join
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT
    USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE
    USING (auth.uid() = user_id);

-- Group Messages: members can read/insert
CREATE POLICY "Group members can read messages" ON public.group_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()
    ));
CREATE POLICY "Group members can send messages" ON public.group_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()
    ));

-- Downloads: track own downloads
CREATE POLICY "Users can track own downloads" ON public.downloads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Bookmarks: users manage own bookmarks
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can add bookmarks" ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove bookmarks" ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);

-- ═══════════ TRIGGERS ═══════════

-- Update profile timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at BEFORE UPDATE ON public.study_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update material rating on review insert/update
CREATE OR REPLACE FUNCTION update_material_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.materials
    SET avg_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE material_id = NEW.material_id
    )
    WHERE id = NEW.material_id;

    -- Update uploader reputation
    UPDATE public.profiles
    SET reputation_score = reputation_score + (
        SELECT COUNT(*) FROM public.materials WHERE uploader_id = NEW.user_id
    )
    WHERE id = (SELECT uploader_id FROM public.materials WHERE id = NEW.material_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
    AFTER INSERT ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION update_material_rating();

-- Increment download count
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.materials
    SET downloads = downloads + 1
    WHERE id = NEW.material_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_material_downloaded
    AFTER INSERT ON public.downloads
    FOR EACH ROW EXECUTE FUNCTION increment_download_count();

-- ═══════════ STORAGE BUCKETS ═══════════
-- Run this separately in Supabase Dashboard → Storage

-- Create materials bucket
-- INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true);

-- Storage policies (add via Dashboard or SQL)
-- CREATE POLICY "Anyone can read materials" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
-- CREATE POLICY "Auth users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials' AND auth.role() = 'authenticated');
-- CREATE POLICY "Owners can delete" ON storage.objects FOR DELETE USING (bucket_id = 'materials' AND auth.uid() = owner);
