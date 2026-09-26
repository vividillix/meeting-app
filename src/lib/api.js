import { getIdToken } from "./auth";

// 서버 함수(api/) 호출. 실패하면 서버가 보낸 { code, message }를 담은 에러를 던짐
export async function callApi(path, body) {
  const token = await getIdToken();

  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    const error = new Error("네트워크 오류");
    error.code = "NETWORK";
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `요청 실패 (${response.status})`);
    error.code = data.code || `HTTP_${response.status}`;
    throw error;
  }

  return data;
}
