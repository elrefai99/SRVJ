#!/usr/bin/env sh
set -e

NGINX_VERSION="v1.10.1"

echo "Installing nginx ingress controller ${NGINX_VERSION} for k3s..."

kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-${NGINX_VERSION}/deploy/static/provider/baremetal/deploy.yaml"

echo "Waiting for ingress-nginx controller to be ready..."
kubectl rollout status deployment/ingress-nginx-controller \
  -n ingress-nginx \
  --timeout=120s

echo "nginx ingress controller is ready."
echo ""
echo "Next steps:"
echo "  1. Fill in k8s/secret.yaml with real values"
echo "  2. kubectl apply -k k8s/"
