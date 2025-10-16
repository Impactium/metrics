package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"metrics/broadcast"
	"metrics/handlers"
	"metrics/middlewares"
	"metrics/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := storage.Connect(ctx); err != nil {
		log.Fatalf("mongo connect: %v", err)
	}
	defer storage.Disconnect(context.Background())

	if err := storage.EnsureIndexes(ctx); err != nil {
		log.Fatalf("mongo indexes: %v", err)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOriginFunc:  func(origin string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Authorization", "Set-Cookie"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	broadcast.Setup()
	defer broadcast.Broadcaster.Close()

	api := r.Group("/api")

	api.GET("/ws/", gin.WrapH(broadcast.Broadcaster))

	api.Use(middlewares.RequestMiddleware())
	api.Use(middlewares.ResponseWrapper())

	// auth
	auth := api.Group("/auth")
	auth.POST("/register", handlers.Register)
	auth.POST("/login", handlers.Login)
	auth.GET("/profile", middlewares.AuthRequired(), handlers.Profile)

	// speedtest
	api.POST("/speedtest", handlers.SpeedtestCreate)
	api.GET("/speedtest", middlewares.AuthRequired(), handlers.SpeedtestList)
	api.GET("/speedtest/tranding", middlewares.AuthRequired(), handlers.SpeedtestTrending)

	// logs
	api.POST("/logs", handlers.LogCreate)
	api.GET("/logs", middlewares.AuthRequired(), handlers.LogList)
	api.GET("/logs/stats", middlewares.AuthRequired(), handlers.LogStats)
	api.GET("/logs/count", middlewares.AuthRequired(), handlers.LogCount)

	srv := &http.Server{
		Addr:              ":1337",
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Println("listening :1337")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server: %v", err)
	}
}
