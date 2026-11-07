package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"
)

var reqCounter uint64

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type OrderRequest struct {
	Item     string  `json:"item"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
}

func main() {
	port := "18090"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}

	mux := http.NewServeMux()

	// 1. Auth endpoint: /api/auth/login
	mux.HandleFunc("/api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&reqCounter, 1)
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req LoginRequest
		_ = json.NewDecoder(r.Body).Decode(&req)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "authenticated",
			"token":  fmt.Sprintf("jwt-token-%s-%d", req.Username, time.Now().UnixNano()),
			"user":   req.Username,
		})
	})

	// 2. Products Catalog: /api/products
	mux.HandleFunc("/api/products", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&reqCounter, 1)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"count": 3,
			"items": []map[string]interface{}{
				{"id": "prod_1", "name": "Mechanical Keyboard", "price": 120.00},
				{"id": "prod_2", "name": "Ultra-wide Monitor", "price": 450.00},
				{"id": "prod_3", "name": "Ergonomic Chair", "price": 300.00},
			},
		})
	})

	// 3. Create Order: /api/orders
	mux.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&reqCounter, 1)
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "missing Authorization token"})
			return
		}

		var req OrderRequest
		_ = json.NewDecoder(r.Body).Decode(&req)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"order_id": fmt.Sprintf("ord_%d", time.Now().UnixNano()),
			"status":   "confirmed",
			"item":     req.Item,
			"total":    req.Price * float64(req.Quantity),
		})
	})

	// 4. Slow endpoint with simulated latency: /api/slow
	mux.HandleFunc("/api/slow", func(w http.ResponseWriter, r *http.Request) {
		atomic.AddUint64(&reqCounter, 1)
		delayMs := 15
		if d := r.URL.Query().Get("ms"); d != "" {
			if v, err := strconv.Atoi(d); err == nil {
				delayMs = v
			}
		}
		time.Sleep(time.Duration(delayMs) * time.Millisecond)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"delayed_ms": delayMs,
			"status":     "completed",
		})
	})

	server := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		log.Printf("Target Test Server listening on http://127.0.0.1:%s ...\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	_ = server.Close()
	log.Printf("Server shut down. Total requests handled: %d\n", atomic.LoadUint64(&reqCounter))
}
