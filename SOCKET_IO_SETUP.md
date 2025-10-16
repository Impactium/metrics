# Socket.IO для Real-time Логів

## Встановлення

### Бекенд (Go)
Залежності вже додані до `api/go.mod`. Виконайте:
```bash
cd api
go mod tidy
```

### Фронтенд (Next.js)
Встановіть socket.io-client:
```bash
cd client
pnpm install socket.io-client
# або
npm install socket.io-client
```

## Зміни

### Бекенд

#### 1. `api/go.mod`
- Додано `github.com/googollee/go-socket.io v1.7.0` як пряму залежність

#### 2. `api/broadcast/socketio.go` (новий файл)
- Створено Socket.IO сервер з підтримкою WebSocket та Polling транспортів
- Функція `NewSocketIOServer()` для ініціалізації сервера
- Функція `BroadcastLog(data any)` для трансляції логів всім клієнтам
- Обробники подій: connect, disconnect, error

#### 3. `api/main.go`
- Ініціалізація Socket.IO сервера
- Додано endpoints `/socket.io/` (GET та POST) для Socket.IO
- Сервер запускається в окремій горутині

#### 4. `api/handlers/log.go`
- При створенні логів викликається `broadcast.BroadcastLog()` для кожного лога
- Логи транслюються в реальному часі всім підключеним клієнтам

#### 5. Видалено `api/broadcast/broadcast.go`
- Старий WebSocket broadcast замінено на Socket.IO

### Фронтенд

#### 1. `client/package.json`
- Додано `socket.io-client: ^4.8.1`

#### 2. `client/src/app/(main)/dashboard/logs/page.tsx`
- Залишається серверним компонентом (SSR)
- Виконує початковий fetch логів та статистики
- Передає дані до клієнтського компонента

#### 3. `client/src/app/(main)/dashboard/logs/_components/logs-page-client.tsx`
- Використовує `socket.io-client` для підключення
- Підключається до Socket.IO сервера з підтримкою WebSocket та Polling
- Слухає події `log` для отримання нових логів
- Автоматичне перепідключення (вбудовано в Socket.IO)
- Обмежує кількість логів до 1000 для продуктивності

## Як це працює

1. **SSR**: Сервер Next.js виконує початковий fetch логів
2. **Гідратація**: Клієнт отримує початкові дані
3. **Socket.IO**: Після монтування компонента встановлюється Socket.IO з'єднання
4. **Real-time**: Нові логи автоматично транслюються через Socket.IO подію `log`
5. **Автоматичне перепідключення**: Socket.IO автоматично перепідключається при розриві

## Переваги Socket.IO над WebSocket

- ✅ Автоматичне перепідключення
- ✅ Fallback на Long Polling якщо WebSocket недоступний
- ✅ Підтримка кімнат та namespaces (для майбутнього розширення)
- ✅ Бінарна підтримка
- ✅ Кросбраузерна сумісність
- ✅ Вбудована підтримка heartbeat/ping-pong

## Тестування

1. Запустіть бекенд:
   ```bash
   cd api
   go run main.go
   ```

2. Запустіть фронтенд:
   ```bash
   cd client
   pnpm dev
   ```

3. Створіть новий лог через API:
   ```bash
   curl -X POST http://localhost:1337/api/logs \
     -H "Content-Type: application/json" \
     -d '[{
       "timestamp": 1729000000000,
       "status": 200,
       "path": "/api/test",
       "method": "GET"
     }]'
   ```

4. Лог автоматично з'явиться на сторінці логів в браузері!

