local http  = require "resty.http"
local cjson = require "cjson.safe"

local _M = { _VERSION = "0.1.0" }

local METRICS_URL = "https://metrics.impactium.dev/api/logs"
local MAX_BODY    = 65536

-- простая генерация UUIDv4 (fallback, если $request_id недоступен)
local function uuid_v4()
  local fmt = string.format
  local rnd = math.random
  return fmt("%08x-%04x-4%03x-%04x-%012x",
    rnd(0,0xffffffff), rnd(0,0xffff), rnd(0,0xfff),
    bit.bor(rnd(0,0x3fff), 0x8000), rnd(0,0xfffff))
end

-- ACCESS: читаем тело запроса
function _M.access()
  -- нужна для чтения тела
  ngx.req.read_body()

  local ct   = ngx.req.get_headers()["content-type"] or ""
  local body = ngx.req.get_body_data()

  if body and #body > MAX_BODY then
    body = string.sub(body, 1, MAX_BODY)
  end

  ngx.ctx.req_ct   = ct
  ngx.ctx.req_body = body
  ngx.ctx.t0_ms    = math.floor(ngx.req.start_time() * 1000)
end

-- BODY_FILTER: буферизуем тело ответа только при ошибках
function _M.body_filter()
  if ngx.status < 400 then return end

  local chunk = ngx.arg[1]
  local eof   = ngx.arg[2]

  if chunk and #chunk > 0 then
    local acc = ngx.ctx.resp_chunks or {}
    acc[#acc + 1] = chunk
    ngx.ctx.resp_chunks = acc
  end

  if eof then
    local resp = table.concat(ngx.ctx.resp_chunks or {})
    if resp and #resp > MAX_BODY then
      resp = string.sub(resp, 1, MAX_BODY)
    end
    ngx.ctx.resp_body = resp
  end
end

-- LOG: отправляем метрику
function _M.log()
  if ngx.var.metrics_enabled ~= "1" then return end

  local req_id = ngx.var.request_id
  if not req_id or req_id == "" then
    -- fallback
    math.randomseed(ngx.now() * 1e6 + ngx.worker.pid())
    req_id = uuid_v4()
  end

  local took_ms = math.floor((tonumber(ngx.var.request_time) or 0) * 1000 + 0.5)
  local ts_ms   = math.floor(ngx.now() * 1000)

  local entry = {
    req_id    = req_id,
    timestamp = ts_ms,
    status    = ngx.status,
    took      = took_ms,
    path      = (ngx.var.scheme or "http") .. "://" .. (ngx.var.host or "") .. (ngx.var.request_uri or "/"),
    method    = ngx.req.get_method(),
    data      = (ngx.status >= 400 and ngx.status <= 599) and {
      request  = { headers = ngx.req.get_headers(),  body = ngx.ctx.req_body, content_type = ngx.ctx.req_ct },
      response = { headers = ngx.resp.get_headers(), body = ngx.ctx.resp_body }
    } or cjson.null
  }

  local payload, enc_err = cjson.encode({ entry })
  if not payload then return end

  local httpc = http.new()
  httpc:set_timeout(1000) -- 1s

  -- fire-and-forget; ошибки умышленно игнорируются
  local _, _ = httpc:request_uri(METRICS_URL, {
    method  = "POST",
    body    = payload,
    headers = { ["Content-Type"] = "application/json", ["Accept"] = "*/*" },
    keepalive = false,
  })
end

return _M
