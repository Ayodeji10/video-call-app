import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";
import "./App.css";
import { useState, useEffect, useRef } from "react";

// const socket = io.connect("http://localhost:5000");
const socket = io.connect("https://video-call-api.onrender.com/");

function App() {
  const [me, setMe] = useState(""); // my id
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState(""); // id of other person
  const [callEnded, setCallEnded] = useState(false);
  const [mesage, setMessage] = useState(""); // my message
  const [messages, setMessages] = useState([]); // array of messages
  const myVideo = useRef(); // my video
  const userVideo = useRef(); // other user video
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
      });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const sendMessage = (e) => {
    e.preventDefault();
    const data = {
      mesage,
      id: socket.id,
      room: "abcde",
    };
    setMessages((prev) => {
      return [...prev, data];
    });
    console.log(socket.id);
    socket.emit("send-message", data);
  };

  useEffect(() => {
    socket.on("recieve-message", (data) => {
      console.log(socket.id);
      console.log(data);
      setMessages((prev) => {
        return [...prev, data];
      });
    });
  }, [socket]);

  useEffect(() => {
    socket.emit("join", "abcde");
  }, []);

  return (
    <div className="App mt-5">
      <h1 className="mb-4">Video Call App</h1>
      <div className="d-flex justify-content-center align-items-lg-center align-items-md-center flex-lg-row flex-md-column gap-5">
        <div className="video d-flex flex-column align-items-center">
          <div className="d-flex mb-3 gap-5">
            <div>
              <h3>My Video</h3>
              {stream && <video playsInline ref={myVideo} autoPlay />}
            </div>
            <div>
              {callAccepted && !callEnded ? (
                <>
                  <h3>Caller Video</h3>
                  <video playsInline ref={userVideo} autoPlay />
                </>
              ) : null}
            </div>
          </div>
          <div className="d-flex gap-5">
            <div className="mb-3">
              <CopyToClipboard text={me}>
                <button>Copy ID</button>
              </CopyToClipboard>
            </div>
            <div>
              <input
                type="text"
                placeholder="Id to call"
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value)}
              />
              {callAccepted && !callEnded ? null : (
                <button onClick={() => callUser(idToCall)}>call</button>
              )}
            </div>
          </div>
          {receivingCall && !callAccepted ? (
            <div>
              <h4>{caller} is calling</h4>
              <button onClick={answerCall}>Answer</button>
            </div>
          ) : null}
        </div>
        {callAccepted && (
          <div className="chat d-flex flex-column justify-content-between">
            <div>
              <h4>Chat Box</h4>
              {messages.map((m, i) => {
                return (
                  <div
                    className={`msg-box d-flex ${
                      m.id !== socket.id
                        ? "justify-content-start"
                        : "justify-content-end mine"
                    }`}
                  >
                    <div className="message">
                      <h5 className="mb-0">{m.mesage}</h5>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <form onSubmit={(e) => sendMessage(e)}>
                <input
                  type="text"
                  placeholder="message"
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button type="submit">send</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
