package main

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"

	"github.com/ogt11/certm3/mw/metrics"
)

func main() {
	// Initialize logger
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{})

	// Initialize metrics
	m := metrics.New()

	// Create router
	r := mux.NewRouter()

	// Add metrics middleware
	r.Use(m.HTTPMiddleware)

	// Add metrics endpoint
	r.Handle("/metrics", m.Handler())

	// Add health check endpoint
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Example of recording business metrics
	go func() {
		for {
			// Simulate some business metrics
			m.SetActiveUsers(100)
			m.SetActiveCertificates(50)
			time.Sleep(30 * time.Second)
		}
	}()

	// Start server
	log.Info("Starting server on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
} 