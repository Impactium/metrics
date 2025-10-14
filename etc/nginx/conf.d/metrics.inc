lua_need_request_body on;

set $metrics_enabled 1;

access_by_lua_block     { require("metrics_logger").access() }
body_filter_by_lua_block{ require("metrics_logger").body_filter() }
log_by_lua_block        { require("metrics_logger").log() }
