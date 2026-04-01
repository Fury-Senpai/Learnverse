import { useEffect } from "react";

const BotpressChat = () => {
  useEffect(() => {
    // inject script 1
    const script1 = document.createElement("script");
    script1.src = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
    script1.async = true;

    // inject script 2
    const script2 = document.createElement("script");
    script2.src = "https://files.bpcontent.cloud/2026/04/01/18/20260401185129-MZBM7CP8.js";
    script2.defer = true;

    document.body.appendChild(script1);
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  return null;
};

export default BotpressChat;