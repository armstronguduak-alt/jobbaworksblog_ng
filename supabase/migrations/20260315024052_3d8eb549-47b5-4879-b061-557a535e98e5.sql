-- Fix remaining financial write vulnerabilities

-- 1) wallet_transactions: remove direct user insert
DROP POLICY IF EXISTS wallet_tx_insert_own_or_admin ON public.wallet_transactions;

CREATE POLICY wallet_tx_admin_insert
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) post_reads: remove direct user insert with arbitrary earned_amount
DROP POLICY IF EXISTS post_reads_insert_own_or_admin ON public.post_reads;

CREATE POLICY post_reads_admin_insert
ON public.post_reads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));