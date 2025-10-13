package broadcast

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Broadcast struct {
	connections map[*websocket.Conn]bool
	mutex       sync.Mutex
}

var Broadcaster *Broadcast

func NewBroadcast() *Broadcast {
	return &Broadcast{
		connections: make(map[*websocket.Conn]bool),
	}
}

func (lb *Broadcast) AddConnection(conn *websocket.Conn) {
	lb.mutex.Lock()
	defer lb.mutex.Unlock()
	lb.connections[conn] = true
}

func (lb *Broadcast) RemoveConnection(conn *websocket.Conn) {
	lb.mutex.Lock()
	defer lb.mutex.Unlock()
	delete(lb.connections, conn)
}

func (lb *Broadcast) Broadcast(entity any) {
	lb.mutex.Lock()
	defer lb.mutex.Unlock()

	for conn := range lb.connections {
		err := conn.WriteJSON(entity)
		if err != nil {
			conn.Close()
			delete(lb.connections, conn)
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade connection"})
			return
		}

		Broadcaster.AddConnection(conn)

		// Handle connection closure
		go func() {
			defer conn.Close()
			defer Broadcaster.RemoveConnection(conn)

			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					break
				}
			}
		}()
	}
}
