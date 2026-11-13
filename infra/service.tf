resource "kubernetes_service" "status-app" {
  metadata {
    name      = "svc-15soat-status-update-service"
    namespace = var.namespace
  }

  spec {
    selector = { app = "15soat-status-update-service" }

    port {
      port        = 3003
      target_port = 3003
      node_port   = 30003
    }

    type = "NodePort"
  }
}
