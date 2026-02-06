# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com
{ pkgs, ... }: {
  # Các gói phần mềm sẽ được cài đặt trong workspace
  packages = [
    pkgs.docker
    pkgs.docker-compose
  ];

  env = {};

  idx = {
    extensions = [
      "ms-azuretools.vscode-docker"
    ];
  };
  idx.workspace = {
    onCreate = {
      "remove_container" = "docker rm -f $(docker ps -aq) 2>/dev/null";
      "remove_image" = "docker rmi -f $(docker images -aq) 2>/dev/null";
      "clear" = "docker system prune -a --volumes -f";
    };
    onStart = {
      "pull" = "git pull origin master";
      "start_docker" = "./scripts/dev.sh";
    };
  };
  services.docker.enable = true;
}
