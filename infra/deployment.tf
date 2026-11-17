resource "kubernetes_deployment" "status-app" {
  metadata {
    name      = "15soat-status-update-service"
    namespace = var.namespace
    labels    = { app = "15soat-status-update-service" }
  }

  spec {
    replicas = 1

    selector {
      match_labels = { app = "15soat-status-update-service" }
    }

    template {
      metadata {
        name   = "15soat-status-update-service"
        labels = { app = "15soat-status-update-service" }
      }

      spec {
        automount_service_account_token = false

        image_pull_secrets {
          name = "ghcr-secrets"
        }

        container {
          name  = "c-15soat-tech-challenge"
          image = var.image

          liveness_probe {
            http_get {
              path = "/health"
              port = 3003
            }
            initial_delay_seconds = 10
          }

          resources {
            requests = {
              cpu               = "100m"
              memory            = "100Mi"
              ephemeral-storage = "2Gi"
            }
            limits = {
              cpu    = "200m"
              memory = "100Mi"
            }
          }

          port {
            container_port = 3003
          }

          env {
            name = "MONGO_URI"
            value = var.mongo_uri
          }

          env {
            name = "RMQ_URL"
            value = var.rmq_url
          }
          
          env {
            name  = "JWT_SECRET"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "JWT_SECRET"
              }
            }
          }
          
          env {
            name  = "CLIENT_ID"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "CLIENT_ID"
              }
            }
          }
          
          env {
            name  = "CLIENT_SECRET"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "CLIENT_SECRET"
              }
            }
          }
          
          env {
            name  = "AUTHORIZATION_SERVER_URL"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "AUTHORIZATION_SERVER_URL"
              }
            }
          }
          
          env {
            name  = "SERVICE_ORDER_URL"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "SERVICE_ORDER_URL"
              }
            }
          }
          
          env {
            name  = "PAYMENT_SERVICE_URL"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "PAYMENT_SERVICE_URL"
              }
            }
          }
          
          env {
            name  = "STOCK_SERVICE_URL"
            value_from {
              secret_key_ref {
                name = "secrets-15soat"
                key  = "STOCK_SERVICE_URL"
              }
            }
          }
        }
      }
    }
  }
}
