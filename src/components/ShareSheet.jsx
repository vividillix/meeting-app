/**
 * 공유 방법 고르기: 카카오톡 카드 / 그 밖의 앱·링크 복사.
 * 카카오 키가 설정돼 있을 때만 뜸 (없으면 공유 버튼이 바로 기존 공유로 감)
 */
export default function ShareSheet({ title = "공유하기", message, onKakao, onOther, onClose }) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog dialog--sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="share-title" className="dialog__title">
          {title}
        </h2>
        {message && <p className="dialog__message">{message}</p>}

        <div className="share-options">
          <button type="button" className="btn btn--kakao" onClick={onKakao}>
            <KakaoBubbleIcon />
            카카오톡으로 보내기
          </button>
          <button type="button" className="btn btn--ghost" onClick={onOther}>
            링크 복사 · 다른 앱
          </button>
        </div>

        <button type="button" className="text-link share-options__close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

function KakaoBubbleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.5c-5.25 0-9.5 3.33-9.5 7.44 0 2.66 1.78 5 4.46 6.31l-.9 3.32c-.08.3.26.54.52.37l3.94-2.62c.48.05.97.08 1.48.08 5.25 0 9.5-3.33 9.5-7.46S17.25 3.5 12 3.5Z"
      />
    </svg>
  );
}
