{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [ pkgs.nodejs_22 ];

  # Prebuilt npm binaries (e.g. @fallow-cli) are generic glibc executables
  # linked against /lib64/ld-linux-x86-64.so.2, which doesn't exist on NixOS.
  # nix-ld's stub loader reads these env vars to find a real loader + libs.
  NIX_LD = pkgs.lib.fileContents "${pkgs.stdenv.cc}/nix-support/dynamic-linker";
  NIX_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
    pkgs.stdenv.cc.cc.lib # libgcc_s
    pkgs.glibc # libc, libm, libdl, libpthread
  ];
}
