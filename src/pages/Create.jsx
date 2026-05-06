import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { generateDates } from "../utils/date";
import { doc, setDoc } from "firebase/firestore";

export default function Create() {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [maxPeople, setMaxPeople] = useState(0);
  const nav = useNavigate();

  const create = async () => {
    if (!title || !start || !end || !maxPeople) {
      alert("값 입력");
      return;
    }

    const id = Date.now().toString();

    const dates = generateDates(start, end);

    await setDoc(doc(db, "rooms", id), {
      title,
      dates,
      maxPeople,
      votes: {},     // 🔥 비어있음
      hostId: null   // 🔥 아직 없음
    });

    nav(`/join/${id}`);  // 🔥 무조건 Join으로 보냄
  };

  return (
    <div className="container">
      <div className="title">방 생성</div>

      <input className="input" placeholder="제목" onChange={e => setTitle(e.target.value)} />
      <input
        className="input"
        type="number"
        placeholder="최대 인원"
        onChange={e => setMaxPeople(Number(e.target.value))}
      />
      <div className="date-group">
        <label className="date-label">시작일</label>
        <input
          className="input date-input"
          type="date"
          onChange={e => setStart(e.target.value)}
        />
      </div>

      <div className="date-group">
        <label className="date-label">종료일</label>
        <input
          className="input date-input"
          type="date"
          onChange={e => setEnd(e.target.value)}
        />
      </div>
      <button className="button" onClick={create}>
        생성
      </button>
    </div>
  );
}