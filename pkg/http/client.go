package http

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

// ClientPool creates tuned HTTP clients for high concurrency load testing
type ClientPool struct {
	client *http.Client
}

// NewClientPool initializes a shared HTTP client with aggressive connection reuse
func NewClientPool(timeout time.Duration) *ClientPool {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        10000,
		MaxIdleConnsPerHost: 2000,
		MaxConnsPerHost:     0, // unlimited
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true, // Allow testing staging/self-signed certs
		},
		DisableCompression: false,
		ForceAttemptHTTP2:  true,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   timeout,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	return &ClientPool{
		client: client,
	}
}

// Client returns the underlying http.Client
func (p *ClientPool) Client() *http.Client {
	return p.client
}

