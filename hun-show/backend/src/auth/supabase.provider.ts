import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createClient(
      config.get<string>('SUPABASE_URL')!,
      config.get<string>('SUPABASE_ANON_KEY')!,
    ),
};
