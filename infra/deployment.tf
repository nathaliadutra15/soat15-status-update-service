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
            name = "DB_NAME"
            value = var.postgres_db
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
        }
      }
    }
  }
}
