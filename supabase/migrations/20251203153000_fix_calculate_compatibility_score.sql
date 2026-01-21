CREATE OR REPLACE FUNCTION public.calculate_compatibility_score(p_user1_id uuid, p_user2_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Fix: Cast to numeric before rounding
  RETURN ROUND((RANDOM() * 100)::numeric, 2);
END;
$function$;
