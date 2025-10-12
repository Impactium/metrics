package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Latency struct {
	High   float64 `json:"high"`
	IQM    float64 `json:"iqm" bson:"iqm"`
	Jitter float64 `json:"jitter"`
	Low    float64 `json:"low"`
}

type Download struct {
	Bandwidth int     `json:"bandwidth"`
	Bytes     int64   `json:"bytes"`
	Elapsed   int64   `json:"elapsed"`
	Latency   Latency `json:"latency" binding:"required"`
}

type Upload struct {
	Bandwidth int     `json:"bandwidth"`
	Bytes     int64   `json:"bytes"`
	Elapsed   int64   `json:"elapsed"`
	Latency   Latency `json:"latency" binding:"required"`
}

type Iface struct {
	ExternalIP string `json:"externalIp" binding:"required" bson:"externalIp"`
	InternalIP string `json:"internalIp" binding:"required" bson:"internalIp"`
	IsVPN      bool   `json:"isVpn" bson:"isVpn"`
	MacAddr    string `json:"macAddr" binding:"required" bson:"macAddr"`
	Name       string `json:"name" binding:"required"`
}

type Ping struct {
	High    float64 `json:"high"`
	Jitter  float64 `json:"jitter"`
	Latency float64 `json:"latency"`
	Low     float64 `json:"low"`
}

type Result struct {
	ID        string `json:"id" binding:"required"`
	Persisted bool   `json:"persisted"`
	URL       string `json:"url" binding:"required"`
}

type Server struct {
	Country  string `json:"country" binding:"required"`
	Host     string `json:"host" binding:"required"`
	ID       int64  `json:"id" binding:"required"`
	IP       string `json:"ip" binding:"required"`
	Location string `json:"location" binding:"required"`
	Name     string `json:"name" binding:"required"`
	Port     int    `json:"port"`
}

type Speedtest struct {
	ID         primitive.ObjectID `json:"-" bson:"_id,omitempty"`
	Download   Download           `json:"download" binding:"required"`
	Interface  Iface              `json:"interface" binding:"required"`
	ISP        string             `json:"isp" binding:"required"`
	PacketLoss float64            `json:"packetLoss"`
	Ping       Ping               `json:"ping" binding:"required"`
	Result     Result             `json:"result" binding:"required"`
	Server     Server             `json:"server" binding:"required"`
	Timestamp  time.Time          `json:"timestamp" binding:"required"`
	Type       string             `json:"type" binding:"required"`
	Upload     Upload             `json:"upload" binding:"required"`
	ReceivedAt *time.Time         `json:"-" bson:"receivedAt,omitempty"`
}
