import { signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";

let signingIn = null;

/**
 * 브라우저마다 보이지 않는 익명 계정을 하나 만들어 계속 씀 (회원가입 화면 없음).
 * 방 참가 정보는 이 계정 ID(uid)에 연결되므로, 같은 브라우저에서는 비밀번호 없이 다시 들어옴.
 */
export async function ensureUser() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;

  if (!signingIn) {
    signingIn = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        signingIn = null;
      });
  }

  return signingIn;
}

export async function getIdToken() {
  const user = await ensureUser();
  return user.getIdToken();
}
