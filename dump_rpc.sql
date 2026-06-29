SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'update_delivery_status_safe';
