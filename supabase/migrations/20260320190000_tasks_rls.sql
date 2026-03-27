-- Ensure tasks table has proper RLS policies for reading and writing
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow admin write tasks" ON public.tasks;
    
    DROP POLICY IF EXISTS "Allow users to see their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow users to update their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow users to insert their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow admin all user tasks" ON public.user_tasks;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;


CREATE POLICY "Allow public read tasks" ON public.tasks 
FOR SELECT USING (true);

CREATE POLICY "Allow admin write tasks" ON public.tasks 
FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own tasks" ON public.user_tasks 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own tasks" ON public.user_tasks 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own tasks" ON public.user_tasks 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Allow admin all user tasks" ON public.user_tasks 
FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));
