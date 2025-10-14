lua_need_request_body on;

lua_package_path "/etc/nginx/lua/?.lua;;";

set $metrics_enabled 1;

access_by_lua_block     { require("metrics_logger").access() }
body_filter_by_lua_block{ require("metrics_logger").body_filter() }
log_by_lua_block        { require("metrics_logger").log() }
