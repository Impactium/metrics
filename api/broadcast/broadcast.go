package broadcast

import (
	socketio "github.com/doquangtan/socketio/v4"
)

var Broadcaster *socketio.Io

func Setup() error {
	Broadcaster = socketio.New()

	Broadcaster.OnConnection(func(s *socketio.Socket) {

	})

	return nil
}

func Close() error {
	if Broadcaster != nil {
		Broadcaster.Close()
	}
	return nil
}

func Log(data any) {
	if Broadcaster != nil {
		Broadcaster.Of("/").Emit("log", data)
	}
}
