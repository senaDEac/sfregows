# Maintainer: sena
pkgname=sfregows
pkgver=1.0.0
pkgrel=1
pkgdesc="Music player and webradio receiver (Winamp 2.x style)"
arch=('x86_64')
url="https://github.com/sena/sfregows"
license=('custom')
depends=('webkit2gtk-4.1' 'gtk3')
source=("sfregows_${pkgver}_amd64.deb")
sha256sums=('SKIP')

package() {
    ar x "$srcdir/sfregows_${pkgver}_amd64.deb" data.tar.gz
    tar -xzf data.tar.gz -C "$pkgdir"
    rm data.tar.gz
}
