# CA y certificados de desarrollo para mTLS
CA_DIR?=./ca
OUT?=./out
DOMAIN?=messaging.local

all: ca server client

ca:
	mkdir -p $(CA_DIR) $(OUT)
	openssl genrsa -out $(CA_DIR)/ca.key 4096
	openssl req -x509 -new -nodes -key $(CA_DIR)/ca.key -sha256 -days 3650 -subj "/CN=GNEW-Dev-CA" -out $(CA_DIR)/ca.crt

server:
	openssl genrsa -out $(OUT)/server.key 2048
	openssl req -new -key $(OUT)/server.key -subj "/CN=$(DOMAIN)" -out $(OUT)/server.csr
	openssl x509 -req -in $(OUT)/server.csr -CA $(CA_DIR)/ca.crt -CAkey $(CA_DIR)/ca.key -CAcreateserial -out $(OUT)/server.crt -days 825 -sha256

client:
	openssl genrsa -out $(OUT)/client.key 2048
	openssl req -new -key $(OUT)/client.key -subj "/CN=gnew-client" -out $(OUT)/client.csr
	openssl x509 -req -in $(OUT)/client.csr -CA $(CA_DIR)/ca.crt -CAkey $(CA_DIR)/ca.key -CAcreateserial -out $(OUT)/client.crt -days 825 -sha256

 
