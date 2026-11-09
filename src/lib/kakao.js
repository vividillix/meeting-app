// 카카오톡 공유 (Kakao JavaScript SDK)
// - 키(VITE_KAKAO_JS_KEY)가 없으면 카카오 공유는 숨기고 기존 공유만 씀
// - SDK는 방 화면에 들어올 때 미리 받아 둠
//   reason: 버튼을 누른 뒤에 받으면 PC에서 공유 팝업이 차단될 수 있음
const SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js";
const JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY;

let loading = null;

export function isKakaoShareEnabled() {
  return Boolean(JS_KEY);
}

function initialized() {
  const Kakao = window.Kakao;
  if (!Kakao) return null;
  if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
  return Kakao;
}

export function loadKakao() {
  if (!JS_KEY) return Promise.reject(new Error("KAKAO_KEY_MISSING"));

  const ready = initialized();
  if (ready) return Promise.resolve(ready);

  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        const Kakao = initialized();
        if (Kakao) resolve(Kakao);
        else reject(new Error("KAKAO_SDK_FAILED"));
      };
      script.onerror = () => reject(new Error("KAKAO_SDK_FAILED"));
      document.head.appendChild(script);
    }).catch((error) => {
      // reason: 네트워크 문제로 실패했으면 다음에 다시 받을 수 있게 비워 둠
      loading = null;
      throw error;
    });
  }

  return loading;
}

// 방 화면에서 미리 받아 두기 (실패해도 조용히 넘어감 — 누를 때 다시 시도)
export function preloadKakao() {
  if (!JS_KEY) return;
  loadKakao().catch(() => {});
}

/** 카카오톡 공유창 열기. template은 buildKakaoTemplate()이 만든 feed 메시지 */
export async function sendKakaoShare(template) {
  const Kakao = initialized() || (await loadKakao());
  Kakao.Share.sendDefault(template);
}
