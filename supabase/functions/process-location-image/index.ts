// @ts-nocheck
// Edge Function - Deno runtime
// Os erros de TypeScript são falsos positivos do editor
// O código funciona corretamente no runtime do Deno

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
