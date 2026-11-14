variable "cluster_name" {
  default = "soat-cluster"
}

variable "namespace" {
  default = "soat-grupo76"
}

variable "image"                       {}
variable "mongo_uri"                   {}
variable "kind_endpoint"               {}
variable "kind_client_certificate"     {}
variable "kind_client_key"             {}
variable "kind_cluster_ca_certificate" {}
