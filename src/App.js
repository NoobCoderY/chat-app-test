import React, { useState } from "react";
import io from "socket.io-client";
import { MdAttachment } from "react-icons/md";
import { AiOutlineFilePdf, AiOutlineFileImage, AiOutlineFileWord, AiOutlineFileText, AiOutlineFile } from "react-icons/ai";

const socket = io("http://localhost:3002");

function App() {
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [joined, setJoined] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  // Helper function to get file format icon
  const getFileIcon = (fileName) => {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    switch (fileExtension) {
      case "pdf":
        return <AiOutlineFilePdf className="text-red-500 w-6 h-6" />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <AiOutlineFileImage className="text-green-500 w-6 h-6" />;
      case "doc":
      case "docx":
        return <AiOutlineFileWord className="text-blue-500 w-6 h-6" />;
      case "txt":
        return <AiOutlineFileText className="text-gray-500 w-6 h-6" />;
      default:
        return <AiOutlineFile className="text-gray-700 w-6 h-6" />;
    }
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      const payload = {
        event: "join-room",
        data: { roomId },
      };
      socket.emit("join-room", JSON.stringify(payload));
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message.trim() || selectedFile) {
      const payload = {
        event: "send-message",
        data: {
          roomId,
          message,
          fileUrl: selectedFile?.url || null,
          company: "8a032d13-2e2d-4731-904f-3ddbef809f01",
          accessToken: "your-access-token",
        },
      };
      socket.emit("send-message", JSON.stringify(payload));
      setMessage("");
      setSelectedFile(null);
      setPreviewUrl("");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploading(true);

      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      // console.log(selectedFile);
      // setSelectedFile({ name: file.name, url: localUrl });

      // setUploading(false);
      

      try {
        const response = await fetch("http://localhost:3002/api/get-signed-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer your-access-token",
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type }),
        });

        const { signedUrl, fileUrl } = await response.json();

        await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        setSelectedFile({ name: file.name, url: fileUrl });
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setUploading(false);
      }
    }
  };

  React.useEffect(() => {
    const handleMessage = (msg) => {
      setChat((prevChat) => [...prevChat, msg]);
    };

    socket.on("receive-message", handleMessage);

    return () => {
      socket.off("receive-message", handleMessage);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md text-gray-800">
        <h1 className="text-2xl font-bold mb-4 text-center text-purple-600">React Chat App</h1>
        {!joined ? (
          <div>
            <input
              type="text"
              placeholder="Enter Room ID"
              className="w-full px-4 py-2 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button
              onClick={joinRoom}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
            >
              Join Room
            </button>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-center text-purple-500 mb-4">Room: {roomId}</h2>
            <div className="border rounded-md h-64 p-4 overflow-y-scroll mb-4 bg-gray-100">
              {chat.length > 0 ? (
                chat.map((msg, idx) => (
                  <div key={idx} className={`${msg?.sender?.user_id === 266 ? "text-right" : "text-left"}`}>
                    <p className="bg-purple-100 text-purple-800 rounded-md px-2 py-1 mb-2 inline-block">
                      {msg?.message}
                    </p>
                    {msg?.fileUrl && (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline block mt-1"
                      >
                        Download File
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No messages yet...</p>
              )}
              {selectedFile && (
                <div className="flex items-center mt-4">
                  {getFileIcon(selectedFile.name)}
                  <p className="bg-gray-200 px-3 py-1 rounded-md inline-block ml-2">{selectedFile.name}</p>
                </div>
              )}
            </div>
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Type your message"
                className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <MdAttachment
                className="text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => document.getElementById("file-upload").click()}
              />
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <button
                onClick={sendMessage}
                className="bg-purple-600 text-white py-2 px-4 rounded-r-md hover:bg-purple-700 transition-colors"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
