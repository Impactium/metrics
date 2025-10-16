package broadcast

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	mu      sync.RWMutex
	clients = make(map[*websocket.Conn]struct{})
)

func Handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	clients[conn] = struct{}{}
	go func(c *websocket.Conn) {
		defer func() {
			delete(clients, c)
			c.Close()
		}()
		for {
			if _, _, err := c.ReadMessage(); err != nil {
				return
			}
		}
	}(conn)
}

func Log(v any) {
	var b []byte
	switch x := v.(type) {
	case []byte:
		b = x
	case string:
		b = []byte(x)
	default:
		var err error
		b, err = json.Marshal(x)
		if err != nil {
			return
		}
	}

	mu.RLock()
	defer mu.RUnlock()
	for c := range clients {
		_ = c.SetWriteDeadline(time.Now().Add(10 * time.Second))
		_ = c.WriteMessage(websocket.TextMessage, b)
	}
}

func Close() {
	mu.Lock()
	defer mu.Unlock()
	for c := range clients {
		_ = c.WriteControl(websocket.CloseMessage, []byte{}, time.Now().Add(1*time.Second))
		_ = c.Close()
		delete(clients, c)
	}
}
