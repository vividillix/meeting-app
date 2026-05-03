import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { generateDates } from "../utils/date";

export default function Create() {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const nav = useNavigate();

  const create = async () => {
    const dates = generateDates(start, end);

    const docRef = await addDoc(collection(db, "rooms"), {
      title,
      startDate: start,
      endDate: end,
      dates,
      users: {},
      votes: {}
    });

    nav(`/join/${docRef.id}`); // 생성 후 로그인 화면으로
  };

  return (
    <div className="container">
      <div className="title">방 생성</div>

      <input className="input" placeholder="제목" onChange={e => setTitle(e.target.value)} />
      <input className="input" type="date" onChange={e => setStart(e.target.value)} />
      <input className="input" type="date" onChange={e => setEnd(e.target.value)} />

      <button className="button" onClick={create}>
        생성
      </button>
    </div>
  );
}