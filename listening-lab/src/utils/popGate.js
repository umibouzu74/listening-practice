// ルーター（createHashRouter）より先に popstate を受け取るための仕組み。
// window の popstate は登録した順に呼ばれる（capture を付けても先にならない）ので、
// App.jsx でルーターを作る前にこのファイルを読み込み、ルーターより先に登録しておく。
// ゲートの関数が true を返すと、そのイベントはルーターに届かない（画面が切り替わらない）。
// 使い道: アドレスバーで URL のハッシュを書き換えたときなど、ルーターの useBlocker が止められない移動の確認
const gates = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    for (const gate of gates) {
      if (gate(e)) {
        e.stopImmediatePropagation();
        return;
      }
    }
  });
}

/** popstate のゲートを追加し、外す関数を返す */
export function addPopGate(gate) {
  gates.add(gate);
  return () => gates.delete(gate);
}
