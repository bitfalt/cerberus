(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,709361,e=>{"use strict";let t=BigInt(0x100000000-1),r=BigInt(32);e.s(["add",0,function(e,t,r,o){let n=(t>>>0)+(o>>>0);return{h:e+r+(n/0x100000000|0)|0,l:0|n}},"add3H",0,(e,t,r,o)=>t+r+o+(e/0x100000000|0)|0,"add3L",0,(e,t,r)=>(e>>>0)+(t>>>0)+(r>>>0),"add4H",0,(e,t,r,o,n)=>t+r+o+n+(e/0x100000000|0)|0,"add4L",0,(e,t,r,o)=>(e>>>0)+(t>>>0)+(r>>>0)+(o>>>0),"add5H",0,(e,t,r,o,n,a)=>t+r+o+n+a+(e/0x100000000|0)|0,"add5L",0,(e,t,r,o,n)=>(e>>>0)+(t>>>0)+(r>>>0)+(o>>>0)+(n>>>0),"rotlBH",0,(e,t,r)=>t<<r-32|e>>>64-r,"rotlBL",0,(e,t,r)=>e<<r-32|t>>>64-r,"rotlSH",0,(e,t,r)=>e<<r|t>>>32-r,"rotlSL",0,(e,t,r)=>t<<r|e>>>32-r,"rotrBH",0,(e,t,r)=>e<<64-r|t>>>r-32,"rotrBL",0,(e,t,r)=>e>>>r-32|t<<64-r,"rotrSH",0,(e,t,r)=>e>>>r|t<<32-r,"rotrSL",0,(e,t,r)=>e<<32-r|t>>>r,"shrSH",0,(e,t,r)=>e>>>r,"shrSL",0,(e,t,r)=>e<<32-r|t>>>r,"split",0,function(e,o=!1){let n=e.length,a=new Uint32Array(n),s=new Uint32Array(n);for(let i=0;i<n;i++){let{h:n,l}=function(e,o=!1){return o?{h:Number(e&t),l:Number(e>>r&t)}:{h:0|Number(e>>r&t),l:0|Number(e&t)}}(e[i],o);[a[i],s[i]]=[n,l]}return[a,s]}])},470525,e=>{"use strict";let t="object"==typeof globalThis&&"crypto"in globalThis?globalThis.crypto:void 0;function r(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name}function o(e){if(!Number.isSafeInteger(e)||e<0)throw Error("positive integer expected, got "+e)}function n(e,...t){if(!r(e))throw Error("Uint8Array expected");if(t.length>0&&!t.includes(e.length))throw Error("Uint8Array expected of length "+t+", got length="+e.length)}let a=68===new Uint8Array(new Uint32Array([0x11223344]).buffer)[0]?e=>e:function(e){for(let r=0;r<e.length;r++){var t;e[r]=(t=e[r])<<24&0xff000000|t<<8&0xff0000|t>>>8&65280|t>>>24&255}return e},s="function"==typeof Uint8Array.from([]).toHex&&"function"==typeof Uint8Array.fromHex,i=Array.from({length:256},(e,t)=>t.toString(16).padStart(2,"0"));function l(e){return e>=48&&e<=57?e-48:e>=65&&e<=70?e-55:e>=97&&e<=102?e-87:void 0}function c(e){if("string"!=typeof e)throw Error("string expected");return new Uint8Array(new TextEncoder().encode(e))}function p(e){return"string"==typeof e&&(e=c(e)),n(e),e}e.s(["Hash",0,class{},"abytes",0,n,"aexists",0,function(e,t=!0){if(e.destroyed)throw Error("Hash instance has been destroyed");if(t&&e.finished)throw Error("Hash#digest() has already been called")},"ahash",0,function(e){if("function"!=typeof e||"function"!=typeof e.create)throw Error("Hash should be wrapped by utils.createHasher");o(e.outputLen),o(e.blockLen)},"anumber",0,o,"aoutput",0,function(e,t){n(e);let r=t.outputLen;if(e.length<r)throw Error("digestInto() expects output buffer of length at least "+r)},"bytesToHex",0,function(e){if(n(e),s)return e.toHex();let t="";for(let r=0;r<e.length;r++)t+=i[e[r]];return t},"bytesToUtf8",0,function(e){return new TextDecoder().decode(e)},"clean",0,function(...e){for(let t=0;t<e.length;t++)e[t].fill(0)},"concatBytes",0,function(...e){let t=0;for(let r=0;r<e.length;r++){let o=e[r];n(o),t+=o.length}let r=new Uint8Array(t);for(let t=0,o=0;t<e.length;t++){let n=e[t];r.set(n,o),o+=n.length}return r},"createHasher",0,function(e){let t=t=>e().update(p(t)).digest(),r=e();return t.outputLen=r.outputLen,t.blockLen=r.blockLen,t.create=()=>e(),t},"createView",0,function(e){return new DataView(e.buffer,e.byteOffset,e.byteLength)},"createXOFer",0,function(e){let t=(t,r)=>e(r).update(p(t)).digest(),r=e({});return t.outputLen=r.outputLen,t.blockLen=r.blockLen,t.create=t=>e(t),t},"hexToBytes",0,function(e){if("string"!=typeof e)throw Error("hex string expected, got "+typeof e);if(s)return Uint8Array.fromHex(e);let t=e.length,r=t/2;if(t%2)throw Error("hex string expected, got unpadded hex of length "+t);let o=new Uint8Array(r);for(let t=0,n=0;t<r;t++,n+=2){let r=l(e.charCodeAt(n)),a=l(e.charCodeAt(n+1));if(void 0===r||void 0===a)throw Error('hex string expected, got non-hex character "'+(e[n]+e[n+1])+'" at index '+n);o[t]=16*r+a}return o},"isBytes",0,r,"randomBytes",0,function(e=32){if(t&&"function"==typeof t.getRandomValues)return t.getRandomValues(new Uint8Array(e));if(t&&"function"==typeof t.randomBytes)return Uint8Array.from(t.randomBytes(e));throw Error("crypto.getRandomValues must be defined")},"rotr",0,function(e,t){return e<<32-t|e>>>t},"swap32IfBE",0,a,"toBytes",0,p,"u32",0,function(e){return new Uint32Array(e.buffer,e.byteOffset,Math.floor(e.byteLength/4))},"utf8ToBytes",0,c],470525)},537792,e=>{"use strict";let t=BigInt(0),r=BigInt(1);function o(e){return e instanceof Uint8Array||ArrayBuffer.isView(e)&&"Uint8Array"===e.constructor.name}function n(e){if(!o(e))throw Error("Uint8Array expected")}function a(e){if("string"!=typeof e)throw Error("hex string expected, got "+typeof e);return""===e?t:BigInt("0x"+e)}let s="function"==typeof Uint8Array.from([]).toHex&&"function"==typeof Uint8Array.fromHex,i=Array.from({length:256},(e,t)=>t.toString(16).padStart(2,"0"));function l(e){if(n(e),s)return e.toHex();let t="";for(let r=0;r<e.length;r++)t+=i[e[r]];return t}function c(e){return e>=48&&e<=57?e-48:e>=65&&e<=70?e-55:e>=97&&e<=102?e-87:void 0}function p(e){if("string"!=typeof e)throw Error("hex string expected, got "+typeof e);if(s)return Uint8Array.fromHex(e);let t=e.length,r=t/2;if(t%2)throw Error("hex string expected, got unpadded hex of length "+t);let o=new Uint8Array(r);for(let t=0,n=0;t<r;t++,n+=2){let r=c(e.charCodeAt(n)),a=c(e.charCodeAt(n+1));if(void 0===r||void 0===a)throw Error('hex string expected, got non-hex character "'+(e[n]+e[n+1])+'" at index '+n);o[t]=16*r+a}return o}function u(e,t){return p(e.toString(16).padStart(2*t,"0"))}function h(...e){let t=0;for(let r=0;r<e.length;r++){let o=e[r];n(o),t+=o.length}let r=new Uint8Array(t);for(let t=0,o=0;t<e.length;t++){let n=e[t];r.set(n,o),o+=n.length}return r}let d=e=>"bigint"==typeof e&&t<=e;function m(e,t,r){return d(e)&&d(t)&&d(r)&&t<=e&&e<r}let y=e=>new Uint8Array(e),f={bigint:e=>"bigint"==typeof e,function:e=>"function"==typeof e,boolean:e=>"boolean"==typeof e,string:e=>"string"==typeof e,stringOrUint8Array:e=>"string"==typeof e||o(e),isSafeInteger:e=>Number.isSafeInteger(e),array:e=>Array.isArray(e),field:(e,t)=>t.Fp.isValid(e),hash:e=>"function"==typeof e&&Number.isSafeInteger(e.outputLen)};e.s(["aInRange",0,function(e,t,r,o){if(!m(t,r,o))throw Error("expected valid "+e+": "+r+" <= n < "+o+", got "+t)},"abool",0,function(e,t){if("boolean"!=typeof t)throw Error(e+" boolean expected, got "+t)},"abytes",0,n,"bitLen",0,function(e){let o;for(o=0;e>t;e>>=r,o+=1);return o},"bitMask",0,e=>(r<<BigInt(e))-r,"bytesToHex",0,l,"bytesToNumberBE",0,function(e){return a(l(e))},"bytesToNumberLE",0,function(e){return n(e),a(l(Uint8Array.from(e).reverse()))},"concatBytes",0,h,"createHmacDrbg",0,function(e,t,r){if("number"!=typeof e||e<2)throw Error("hashLen must be a number");if("number"!=typeof t||t<2)throw Error("qByteLen must be a number");if("function"!=typeof r)throw Error("hmacFn must be a function");let o=y(e),n=y(e),a=0,s=()=>{o.fill(1),n.fill(0),a=0},i=(...e)=>r(n,o,...e),l=(e=y(0))=>{let t;if(n=i((t=[0],Uint8Array.from(t)),e),o=i(),0!==e.length){let t;n=i((t=[1],Uint8Array.from(t)),e),o=i()}},c=()=>{if(a++>=1e3)throw Error("drbg: tried 1000 values");let e=0,r=[];for(;e<t;){let t=(o=i()).slice();r.push(t),e+=o.length}return h(...r)};return(e,t)=>{let r;for(s(),l(e);!(r=t(c()));)l();return s(),r}},"ensureBytes",0,function(e,t,r){let n;if("string"==typeof t)try{n=p(t)}catch(t){throw Error(e+" must be hex string or Uint8Array, cause: "+t)}else if(o(t))n=Uint8Array.from(t);else throw Error(e+" must be hex string or Uint8Array");let a=n.length;if("number"==typeof r&&a!==r)throw Error(e+" of length "+r+" expected, got "+a);return n},"equalBytes",0,function(e,t){if(e.length!==t.length)return!1;let r=0;for(let o=0;o<e.length;o++)r|=e[o]^t[o];return 0===r},"hexToBytes",0,p,"inRange",0,m,"isBytes",0,o,"memoized",0,function(e){let t=new WeakMap;return(r,...o)=>{let n=t.get(r);if(void 0!==n)return n;let a=e(r,...o);return t.set(r,a),a}},"numberToBytesBE",0,u,"numberToBytesLE",0,function(e,t){return u(e,t).reverse()},"numberToHexUnpadded",0,function(e){let t=e.toString(16);return 1&t.length?"0"+t:t},"utf8ToBytes",0,function(e){if("string"!=typeof e)throw Error("string expected");return new Uint8Array(new TextEncoder().encode(e))},"validateObject",0,function(e,t,r={}){let o=(t,r,o)=>{let n=f[r];if("function"!=typeof n)throw Error("invalid validator function");let a=e[t];if((!o||void 0!==a)&&!n(a,e))throw Error("param "+String(t)+" is invalid. Expected "+r+", got "+a)};for(let[e,r]of Object.entries(t))o(e,r,!1);for(let[e,t]of Object.entries(r))o(e,t,!0);return e}])},755263,e=>{"use strict";var t=`{
  "connect_wallet": {
    "label": "Connect Wallet",
    "wrong_network": {
      "label": "Wrong network"
    }
  },

  "intro": {
    "title": "What is a Wallet?",
    "description": "A wallet is used to send, receive, store, and display digital assets. It's also a new way to log in, without needing to create new accounts and passwords on every website.",
    "digital_asset": {
      "title": "A Home for your Digital Assets",
      "description": "Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs."
    },
    "login": {
      "title": "A New Way to Log In",
      "description": "Instead of creating new accounts and passwords on every website, just connect your wallet."
    },
    "get": {
      "label": "Get a Wallet"
    },
    "learn_more": {
      "label": "Learn More"
    }
  },

  "sign_in": {
    "label": "Verify your account",
    "description": "To finish connecting, you must sign a message in your wallet to verify that you are the owner of this account.",
    "message": {
      "send": "Sign message",
      "preparing": "Preparing message...",
      "cancel": "Cancel",
      "preparing_error": "Error preparing message, please retry!"
    },
    "signature": {
      "waiting": "Waiting for signature...",
      "verifying": "Verifying signature...",
      "signing_error": "Error signing message, please retry!",
      "verifying_error": "Error verifying signature, please retry!",
      "oops_error": "Oops, something went wrong!"
    }
  },

  "connect": {
    "label": "Connect",
    "title": "Connect a Wallet",
    "new_to_ethereum": {
      "description": "New to Ethereum wallets?",
      "learn_more": {
        "label": "Learn More"
      }
    },
    "learn_more": {
      "label": "Learn more"
    },
    "recent": "Recent",
    "status": {
      "opening": "Opening %{wallet}...",
      "connecting": "Connecting",
      "connect_mobile": "Continue in %{wallet}",
      "not_installed": "%{wallet} is not installed",
      "not_available": "%{wallet} is not available",
      "confirm": "Confirm connection in the extension",
      "confirm_mobile": "Accept connection request in the wallet"
    },
    "secondary_action": {
      "get": {
        "description": "Don't have %{wallet}?",
        "label": "GET"
      },
      "install": {
        "label": "INSTALL"
      },
      "retry": {
        "label": "RETRY"
      }
    },
    "walletconnect": {
      "description": {
        "full": "Need the official WalletConnect modal?",
        "compact": "Need the WalletConnect modal?"
      },
      "open": {
        "label": "OPEN"
      }
    }
  },

  "connect_scan": {
    "title": "Scan with %{wallet}",
    "fallback_title": "Scan with your phone"
  },

  "connector_group": {
    "installed": "Installed",
    "recommended": "Recommended",
    "other": "Other",
    "popular": "Popular",
    "more": "More",
    "others": "Others"
  },

  "get": {
    "title": "Get a Wallet",
    "action": {
      "label": "GET"
    },
    "mobile": {
      "description": "Mobile Wallet"
    },
    "extension": {
      "description": "Browser Extension"
    },
    "mobile_and_extension": {
      "description": "Mobile Wallet and Extension"
    },
    "mobile_and_desktop": {
      "description": "Mobile and Desktop Wallet"
    },
    "looking_for": {
      "title": "Not what you're looking for?",
      "mobile": {
        "description": "Select a wallet on the main screen to get started with a different wallet provider."
      },
      "desktop": {
        "compact_description": "Select a wallet on the main screen to get started with a different wallet provider.",
        "wide_description": "Select a wallet on the left to get started with a different wallet provider."
      }
    }
  },

  "get_options": {
    "title": "Get started with %{wallet}",
    "short_title": "Get %{wallet}",
    "mobile": {
      "title": "%{wallet} for Mobile",
      "description": "Use the mobile wallet to explore the world of Ethereum.",
      "download": {
        "label": "Get the app"
      }
    },
    "extension": {
      "title": "%{wallet} for %{browser}",
      "description": "Access your wallet right from your favorite web browser.",
      "download": {
        "label": "Add to %{browser}"
      }
    },
    "desktop": {
      "title": "%{wallet} for %{platform}",
      "description": "Access your wallet natively from your powerful desktop.",
      "download": {
        "label": "Add to %{platform}"
      }
    }
  },

  "get_mobile": {
    "title": "Install %{wallet}",
    "description": "Scan with your phone to download on iOS or Android",
    "continue": {
      "label": "Continue"
    }
  },

  "get_instructions": {
    "mobile": {
      "connect": {
        "label": "Connect"
      },
      "learn_more": {
        "label": "Learn More"
      }
    },
    "extension": {
      "refresh": {
        "label": "Refresh"
      },
      "learn_more": {
        "label": "Learn More"
      }
    },
    "desktop": {
      "connect": {
        "label": "Connect"
      },
      "learn_more": {
        "label": "Learn More"
      }
    }
  },

  "chains": {
    "title": "Switch Networks",
    "wrong_network": "Wrong network detected, switch or disconnect to continue.",
    "confirm": "Confirm in Wallet",
    "switching_not_supported": "Your wallet does not support switching networks from %{appName}. Try switching networks from within your wallet instead.",
    "switching_not_supported_fallback": "Your wallet does not support switching networks from this app. Try switching networks from within your wallet instead.",
    "disconnect": "Disconnect",
    "connected": "Connected"
  },

  "profile": {
    "disconnect": {
      "label": "Disconnect"
    },
    "copy_address": {
      "label": "Copy Address",
      "copied": "Copied!"
    },
    "explorer": {
      "label": "View more on explorer"
    },
    "transactions": {
      "description": "%{appName} transactions will appear here...",
      "description_fallback": "Your transactions will appear here...",
      "recent": {
        "title": "Recent Transactions"
      },
      "clear": {
        "label": "Clear All"
      }
    }
  },

  "wallet_connectors": {
    "ready": {
      "qr_code": {
        "step1": {
          "description": "Add Ready to your home screen for faster access to your wallet.",
          "title": "Open the Ready app"
        },
        "step2": {
          "description": "Create a wallet and username, or import an existing wallet.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "berasig": {
      "extension": {
        "step1": {
          "title": "Install the BeraSig extension",
          "description": "We recommend pinning BeraSig to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "best": {
      "qr_code": {
        "step1": {
          "title": "Open the Best Wallet app",
          "description": "Add Best Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "bifrost": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bifrost Wallet on your home screen for quicker access.",
          "title": "Open the Bifrost Wallet app"
        },
        "step2": {
          "description": "Create or import a wallet using your recovery phrase.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "bitget": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bitget Wallet on your home screen for quicker access.",
          "title": "Open the Bitget Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Bitget Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Bitget Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "bitski": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Bitski to your taskbar for quicker access to your wallet.",
          "title": "Install the Bitski extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "bitverse": {
      "qr_code": {
        "step1": {
          "title": "Open the Bitverse Wallet app",
          "description": "Add Bitverse Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "bloom": {
      "desktop": {
        "step1": {
          "title": "Open the Bloom Wallet app",
          "description": "We recommend putting Bloom Wallet on your home screen for quicker access."
        },
        "step2": {
          "description": "Create or import a wallet using your recovery phrase.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you have a wallet, click on Connect to connect via Bloom. A connection prompt in the app will appear for you to confirm the connection.",
          "title": "Click on Connect"
        }
      }
    },

    "bybit": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Bybit on your home screen for faster access to your wallet.",
          "title": "Open the Bybit app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "Click at the top right of your browser and pin Bybit Wallet for easy access.",
          "title": "Install the Bybit Wallet extension"
        },
        "step2": {
          "description": "Create a new wallet or import an existing one.",
          "title": "Create or Import a wallet"
        },
        "step3": {
          "description": "Once you set up Bybit Wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "binance": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Binance on your home screen for faster access to your wallet.",
          "title": "Open the Binance app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Binance Wallet extension",
          "description": "We recommend pinning Binance Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "coin98": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Coin98 Wallet on your home screen for faster access to your wallet.",
          "title": "Open the Coin98 Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },

      "extension": {
        "step1": {
          "description": "Click at the top right of your browser and pin Coin98 Wallet for easy access.",
          "title": "Install the Coin98 Wallet extension"
        },
        "step2": {
          "description": "Create a new wallet or import an existing one.",
          "title": "Create or Import a wallet"
        },
        "step3": {
          "description": "Once you set up Coin98 Wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "coinbase": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Coinbase Wallet on your home screen for quicker access.",
          "title": "Open the Coinbase Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using the cloud backup feature.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Coinbase Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Coinbase Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "compass": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Compass Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Compass Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "core": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Core on your home screen for faster access to your wallet.",
          "title": "Open the Core app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Core to your taskbar for quicker access to your wallet.",
          "title": "Install the Core extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "fox": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting FoxWallet on your home screen for quicker access.",
          "title": "Open the FoxWallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "frontier": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Frontier Wallet on your home screen for quicker access.",
          "title": "Open the Frontier Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Frontier Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Frontier Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "im_token": {
      "qr_code": {
        "step1": {
          "title": "Open the imToken app",
          "description": "Put imToken app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "iopay": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting ioPay on your home screen for faster access to your wallet.",
          "title": "Open the ioPay app"
        },
        "step2": {
          "description": "You can easily backup your wallet using our backup feature on your phone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the WalletConnect button"
        }
      }
    },

    "kaikas": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Kaikas to your taskbar for quicker access to your wallet.",
          "title": "Install the Kaikas extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Kaikas app",
          "description": "Put Kaikas app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "kaia": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Kaia to your taskbar for quicker access to your wallet.",
          "title": "Install the Kaia extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Kaia app",
          "description": "Put Kaia app on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap Scanner Icon in top right corner",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "kraken": {
      "qr_code": {
        "step1": {
          "title": "Open the Kraken Wallet app",
          "description": "Add Kraken Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "kresus": {
      "qr_code": {
        "step1": {
          "title": "Open the Kresus Wallet app",
          "description": "Add Kresus Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "magicEden": {
      "extension": {
        "step1": {
          "title": "Install the Magic Eden extension",
          "description": "We recommend pinning Magic Eden to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "metamask": {
      "qr_code": {
        "step1": {
          "title": "Open the MetaMask app",
          "description": "We recommend putting MetaMask on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the MetaMask extension",
          "description": "We recommend pinning MetaMask to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "nestwallet": {
      "extension": {
        "step1": {
          "title": "Install the NestWallet extension",
          "description": "We recommend pinning NestWallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "okx": {
      "qr_code": {
        "step1": {
          "title": "Open the OKX Wallet app",
          "description": "We recommend putting OKX Wallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the OKX Wallet extension",
          "description": "We recommend pinning OKX Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "omni": {
      "qr_code": {
        "step1": {
          "title": "Open the Omni app",
          "description": "Add Omni to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your home screen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "1inch": {
      "qr_code": {
        "step1": {
          "description": "Put 1inch Wallet on your home screen for faster access to your wallet.",
          "title": "Open the 1inch Wallet app"
        },
        "step2": {
          "description": "Create a wallet and username, or import an existing wallet.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "token_pocket": {
      "qr_code": {
        "step1": {
          "title": "Open the TokenPocket app",
          "description": "We recommend putting TokenPocket on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the TokenPocket extension",
          "description": "We recommend pinning TokenPocket to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "trust": {
      "qr_code": {
        "step1": {
          "title": "Open the Trust Wallet app",
          "description": "Put Trust Wallet on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the Trust Wallet extension",
          "description": "Click at the top right of your browser and pin Trust Wallet for easy access."
        },
        "step2": {
          "title": "Create or Import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up Trust Wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "uniswap": {
      "qr_code": {
        "step1": {
          "title": "Open the Uniswap app",
          "description": "Add Uniswap Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "zerion": {
      "qr_code": {
        "step1": {
          "title": "Open the Zerion app",
          "description": "We recommend putting Zerion on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },

      "extension": {
        "step1": {
          "title": "Install the Zerion extension",
          "description": "We recommend pinning Zerion to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "rainbow": {
      "qr_code": {
        "step1": {
          "title": "Open the Rainbow app",
          "description": "We recommend putting Rainbow on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "You can easily backup your wallet using our backup feature on your phone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "enkrypt": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Enkrypt Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Enkrypt Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "frame": {
      "extension": {
        "step1": {
          "description": "We recommend pinning Frame to your taskbar for quicker access to your wallet.",
          "title": "Install Frame & the companion extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "one_key": {
      "extension": {
        "step1": {
          "title": "Install the OneKey Wallet extension",
          "description": "We recommend pinning OneKey Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "paraswap": {
      "qr_code": {
        "step1": {
          "title": "Open the ParaSwap app",
          "description": "Add ParaSwap Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      }
    },

    "phantom": {
      "extension": {
        "step1": {
          "title": "Install the Phantom extension",
          "description": "We recommend pinning Phantom to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "rabby": {
      "extension": {
        "step1": {
          "title": "Install the Rabby extension",
          "description": "We recommend pinning Rabby to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "ronin": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting Ronin Wallet on your home screen for quicker access.",
          "title": "Open the Ronin Wallet app"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      },

      "extension": {
        "step1": {
          "description": "We recommend pinning Ronin Wallet to your taskbar for quicker access to your wallet.",
          "title": "Install the Ronin Wallet extension"
        },
        "step2": {
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension.",
          "title": "Refresh your browser"
        }
      }
    },

    "ramper": {
      "extension": {
        "step1": {
          "title": "Install the Ramper extension",
          "description": "We recommend pinning Ramper to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "safeheron": {
      "extension": {
        "step1": {
          "title": "Install the Core extension",
          "description": "We recommend pinning Safeheron to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "taho": {
      "extension": {
        "step1": {
          "title": "Install the Taho extension",
          "description": "We recommend pinning Taho to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "wigwam": {
      "extension": {
        "step1": {
          "title": "Install the Wigwam extension",
          "description": "We recommend pinning Wigwam to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "talisman": {
      "extension": {
        "step1": {
          "title": "Install the Talisman extension",
          "description": "We recommend pinning Talisman to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import an Ethereum Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "ctrl": {
      "extension": {
        "step1": {
          "title": "Install the CTRL Wallet extension",
          "description": "We recommend pinning CTRL Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "zeal": {
      "qr_code": {
        "step1": {
          "title": "Open the Zeal app",
          "description": "Add Zeal Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the QR icon and scan",
          "description": "Tap the QR icon on your homescreen, scan the code and confirm the prompt to connect."
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Zeal extension",
          "description": "We recommend pinning Zeal to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "safepal": {
      "extension": {
        "step1": {
          "title": "Install the SafePal Wallet extension",
          "description": "Click at the top right of your browser and pin SafePal Wallet for easy access."
        },
        "step2": {
          "title": "Create or Import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up SafePal Wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the SafePal Wallet app",
          "description": "Put SafePal Wallet on your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Choose New Connection, then scan the QR code and confirm the prompt to connect."
        }
      }
    },

    "desig": {
      "extension": {
        "step1": {
          "title": "Install the Desig extension",
          "description": "We recommend pinning Desig to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "subwallet": {
      "extension": {
        "step1": {
          "title": "Install the SubWallet extension",
          "description": "We recommend pinning SubWallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the SubWallet app",
          "description": "We recommend putting SubWallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "clv": {
      "extension": {
        "step1": {
          "title": "Install the CLV Wallet extension",
          "description": "We recommend pinning CLV Wallet to your taskbar for quicker access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the CLV Wallet app",
          "description": "We recommend putting CLV Wallet on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret phrase with anyone."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "okto": {
      "qr_code": {
        "step1": {
          "title": "Open the Okto app",
          "description": "Add Okto to your home screen for quick access"
        },
        "step2": {
          "title": "Create an MPC Wallet",
          "description": "Create an account and generate a wallet"
        },
        "step3": {
          "title": "Tap WalletConnect in Settings",
          "description": "Tap the Scan QR icon at the top right and confirm the prompt to connect."
        }
      }
    },

    "ledger": {
      "desktop": {
        "step1": {
          "title": "Open the Ledger Live app",
          "description": "We recommend putting Ledger Live on your home screen for quicker access."
        },
        "step2": {
          "title": "Set up your Ledger",
          "description": "Set up a new Ledger or connect to an existing one."
        },
        "step3": {
          "title": "Connect",
          "description": "A connection prompt will appear for you to connect your wallet."
        }
      },
      "qr_code": {
        "step1": {
          "title": "Open the Ledger Live app",
          "description": "We recommend putting Ledger Live on your home screen for quicker access."
        },
        "step2": {
          "title": "Set up your Ledger",
          "description": "You can either sync with the desktop app or connect your Ledger."
        },
        "step3": {
          "title": "Scan the code",
          "description": "Tap WalletConnect then Switch to Scanner. After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "valora": {
      "qr_code": {
        "step1": {
          "title": "Open the Valora app",
          "description": "We recommend putting Valora on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or import a wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "gate": {
      "qr_code": {
        "step1": {
          "title": "Open the Gate app",
          "description": "We recommend putting Gate on your home screen for quicker access."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      },
      "extension": {
        "step1": {
          "title": "Install the Gate extension",
          "description": "We recommend pinning Gate to your taskbar for easier access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Be sure to back up your wallet using a secure method. Never share your secret recovery phrase with anyone."
        },
        "step3": {
          "title": "Refresh your browser",
          "description": "Once you set up your wallet, click below to refresh the browser and load up the extension."
        }
      }
    },

    "gemini": {
      "qr_code": {
        "step1": {
          "title": "Open keys.gemini.com",
          "description": "Visit keys.gemini.com on your mobile browser - no app download required."
        },
        "step2": {
          "title": "Create Your Wallet Instantly",
          "description": "Set up your smart wallet in seconds using your device's built-in authentication."
        },
        "step3": {
          "title": "Scan to Connect",
          "description": "Scan the QR code to instantly connect your wallet - it just works."
        }
      },
      "extension": {
        "step1": {
          "title": "Go to keys.gemini.com",
          "description": "No extensions or downloads needed - your wallet lives securely in the browser."
        },
        "step2": {
          "title": "One-Click Setup",
          "description": "Create your smart wallet instantly with passkey authentication - easier than any wallet out there."
        },
        "step3": {
          "title": "Connect and Go",
          "description": "Approve the connection and you're ready - the unopinionated wallet that just works."
        }
      }
    },

    "xportal": {
      "qr_code": {
        "step1": {
          "description": "Put xPortal on your home screen for faster access to your wallet.",
          "title": "Open the xPortal app"
        },
        "step2": {
          "description": "Create a wallet or import an existing one.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the Scan QR button"
        }
      }
    },

    "mew": {
      "qr_code": {
        "step1": {
          "description": "We recommend putting MEW Wallet on your home screen for quicker access.",
          "title": "Open the MEW Wallet app"
        },
        "step2": {
          "description": "You can easily backup your wallet using the cloud backup feature.",
          "title": "Create or Import a Wallet"
        },
        "step3": {
          "description": "After you scan, a connection prompt will appear for you to connect your wallet.",
          "title": "Tap the scan button"
        }
      }
    },

    "zilpay": {
      "qr_code": {
        "step1": {
          "title": "Open the ZilPay app",
          "description": "Add ZilPay to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    },

    "nova": {
      "qr_code": {
        "step1": {
          "title": "Open the Nova Wallet app",
          "description": "Add Nova Wallet to your home screen for faster access to your wallet."
        },
        "step2": {
          "title": "Create or Import a Wallet",
          "description": "Create a new wallet or import an existing one."
        },
        "step3": {
          "title": "Tap the scan button",
          "description": "After you scan, a connection prompt will appear for you to connect your wallet."
        }
      }
    }
  }
}
`;e.s(["en_US_default",0,t])},881837,992652,407065,621490,766816,141942,86479,e=>{"use strict";let t={gasPriceOracle:{address:"0x420000000000000000000000000000000000000F"},l1Block:{address:"0x4200000000000000000000000000000000000015"},l2CrossDomainMessenger:{address:"0x4200000000000000000000000000000000000007"},l2Erc721Bridge:{address:"0x4200000000000000000000000000000000000014"},l2StandardBridge:{address:"0x4200000000000000000000000000000000000010"},l2ToL1MessagePasser:{address:"0x4200000000000000000000000000000000000016"}};e.s(["contracts",0,t],992652);var r=e.i(450323),o=e.i(557874),n=e.i(982191),a=e.i(839080);let s={block:(0,o.defineBlock)({format:e=>({transactions:e.transactions?.map(e=>{if("string"==typeof e)return e;let t=(0,n.formatTransaction)(e);return"0x7e"===t.typeHex&&(t.isSystemTx=e.isSystemTx,t.mint=e.mint?(0,r.hexToBigInt)(e.mint):void 0,t.sourceHash=e.sourceHash,t.type="deposit"),t}),stateRoot:e.stateRoot})}),transaction:(0,n.defineTransaction)({format(e){let t={};return"0x7e"===e.type&&(t.isSystemTx=e.isSystemTx,t.mint=e.mint?(0,r.hexToBigInt)(e.mint):void 0,t.sourceHash=e.sourceHash,t.type="deposit"),t}}),transactionReceipt:(0,a.defineTransactionReceipt)({format:e=>({l1GasPrice:e.l1GasPrice?(0,r.hexToBigInt)(e.l1GasPrice):null,l1GasUsed:e.l1GasUsed?(0,r.hexToBigInt)(e.l1GasUsed):null,l1Fee:e.l1Fee?(0,r.hexToBigInt)(e.l1Fee):null,l1FeeScalar:e.l1FeeScalar?Number(e.l1FeeScalar):null})})};e.s(["formatters",0,s],407065);var i=e.i(608861),l=e.i(796516),c=e.i(147526),p=e.i(675107),u=e.i(70326);e.s(["serializeTransaction",()=>O,"toYParitySignatureArray",()=>A],766816);var h=e.i(393702),d=e.i(94371),m=e.i(49810),y=e.i(883031),f=e.i(310538),w=e.i(8406),b=e.i(556047),g=e.i(674768),x=e.i(569934),k=e.i(86741),v=e.i(505880),W=e.i(853532),C=e.i(401319),q=e.i(790063);function T(e){let{chainId:t,maxPriorityFeePerGas:r,maxFeePerGas:o,to:n}=e;if(t<=0)throw new v.InvalidChainIdError({chainId:t});if(n&&!(0,l.isAddress)(n))throw new i.InvalidAddressError({address:n});if(o&&o>g.maxUint256)throw new W.FeeCapTooHighError({maxFeePerGas:o});if(r&&o&&r>o)throw new W.TipAboveFeeCapError({maxFeePerGas:o,maxPriorityFeePerGas:r})}var I=e.i(576213);function P(e){if(!e||0===e.length)return[];let t=[];for(let r=0;r<e.length;r++){let{address:o,storageKeys:n}=e[r];for(let e=0;e<n.length;e++)if(n[e].length-2!=64)throw new h.InvalidStorageKeySizeError({storageKey:n[e]});if(!(0,l.isAddress)(o,{strict:!1}))throw new i.InvalidAddressError({address:o});t.push([o,n])}return t}function O(e,t){let o=(0,I.getTransactionType)(e);return"eip1559"===o?function(e,t){let{chainId:r,gas:o,nonce:n,to:a,value:s,maxFeePerGas:i,maxPriorityFeePerGas:l,accessList:h,data:d}=e;T(e);let m=P(h),y=[(0,p.numberToHex)(r),n?(0,p.numberToHex)(n):"0x",l?(0,p.numberToHex)(l):"0x",i?(0,p.numberToHex)(i):"0x",o?(0,p.numberToHex)(o):"0x",a??"0x",s?(0,p.numberToHex)(s):"0x",d??"0x",m,...A(e,t)];return(0,c.concatHex)(["0x02",(0,u.toRlp)(y)])}(e,t):"eip2930"===o?function(e,t){let{chainId:r,gas:o,data:n,nonce:a,to:s,value:h,accessList:d,gasPrice:m}=e;!function(e){let{chainId:t,maxPriorityFeePerGas:r,gasPrice:o,maxFeePerGas:n,to:a}=e;if(t<=0)throw new v.InvalidChainIdError({chainId:t});if(a&&!(0,l.isAddress)(a))throw new i.InvalidAddressError({address:a});if(r||n)throw new x.BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid EIP-2930 Transaction attribute.");if(o&&o>g.maxUint256)throw new W.FeeCapTooHighError({maxFeePerGas:o})}(e);let y=P(d),f=[(0,p.numberToHex)(r),a?(0,p.numberToHex)(a):"0x",m?(0,p.numberToHex)(m):"0x",o?(0,p.numberToHex)(o):"0x",s??"0x",h?(0,p.numberToHex)(h):"0x",n??"0x",y,...A(e,t)];return(0,c.concatHex)(["0x01",(0,u.toRlp)(f)])}(e,t):"eip4844"===o?function(e,t){let{chainId:o,gas:n,nonce:a,to:s,value:i,maxFeePerBlobGas:l,maxFeePerGas:h,maxPriorityFeePerGas:w,accessList:g,data:x}=e;!function(e){let{blobVersionedHashes:t}=e;if(t){if(0===t.length)throw new k.EmptyBlobError;for(let e of t){let t=(0,C.size)(e),o=(0,r.hexToNumber)((0,q.slice)(e,0,1));if(32!==t)throw new k.InvalidVersionedHashSizeError({hash:e,size:t});if(o!==b.versionedHashVersionKzg)throw new k.InvalidVersionedHashVersionError({hash:e,version:o})}}T(e)}(e);let v=e.blobVersionedHashes,W=e.sidecars;if(e.blobs&&(void 0===v||void 0===W)){let t="string"==typeof e.blobs[0]?e.blobs:e.blobs.map(e=>(0,p.bytesToHex)(e)),r=e.kzg,o=(0,d.blobsToCommitments)({blobs:t,kzg:r});if(void 0===v&&(v=(0,y.commitmentsToVersionedHashes)({commitments:o})),void 0===W){let e=(0,m.blobsToProofs)({blobs:t,commitments:o,kzg:r});W=(0,f.toBlobSidecars)({blobs:t,commitments:o,proofs:e})}}let I=P(g),O=[(0,p.numberToHex)(o),a?(0,p.numberToHex)(a):"0x",w?(0,p.numberToHex)(w):"0x",h?(0,p.numberToHex)(h):"0x",n?(0,p.numberToHex)(n):"0x",s??"0x",i?(0,p.numberToHex)(i):"0x",x??"0x",I,l?(0,p.numberToHex)(l):"0x",v??[],...A(e,t)],j=[],B=[],_=[];if(W)for(let e=0;e<W.length;e++){let{blob:t,commitment:r,proof:o}=W[e];j.push(t),B.push(r),_.push(o)}return(0,c.concatHex)(["0x03",W?(0,u.toRlp)([O,j,B,_]):(0,u.toRlp)(O)])}(e,t):"eip7702"===o?function(e,t){let{authorizationList:r,chainId:o,gas:n,nonce:a,to:s,value:h,maxFeePerGas:d,maxPriorityFeePerGas:m,accessList:y,data:f}=e;!function(e){let{authorizationList:t}=e;if(t)for(let e of t){let{chainId:t}=e,r=e.address;if(!(0,l.isAddress)(r))throw new i.InvalidAddressError({address:r});if(t<0)throw new v.InvalidChainIdError({chainId:t})}T(e)}(e);let w=P(y),b=function(e){if(!e||0===e.length)return[];let t=[];for(let r of e){let{chainId:e,nonce:o,...n}=r,a=r.address;t.push([e?(0,p.toHex)(e):"0x",a,o?(0,p.toHex)(o):"0x",...A({},n)])}return t}(r);return(0,c.concatHex)(["0x04",(0,u.toRlp)([(0,p.numberToHex)(o),a?(0,p.numberToHex)(a):"0x",m?(0,p.numberToHex)(m):"0x",d?(0,p.numberToHex)(d):"0x",n?(0,p.numberToHex)(n):"0x",s??"0x",h?(0,p.numberToHex)(h):"0x",f??"0x",w,b,...A(e,t)])])}(e,t):function(e,t){let{chainId:r=0,gas:o,data:n,nonce:a,to:s,value:c,gasPrice:d}=e;!function(e){let{chainId:t,maxPriorityFeePerGas:r,gasPrice:o,maxFeePerGas:n,to:a}=e;if(a&&!(0,l.isAddress)(a))throw new i.InvalidAddressError({address:a});if(void 0!==t&&t<=0)throw new v.InvalidChainIdError({chainId:t});if(r||n)throw new x.BaseError("`maxFeePerGas`/`maxPriorityFeePerGas` is not a valid Legacy Transaction attribute.");if(o&&o>g.maxUint256)throw new W.FeeCapTooHighError({maxFeePerGas:o})}(e);let m=[a?(0,p.numberToHex)(a):"0x",d?(0,p.numberToHex)(d):"0x",o?(0,p.numberToHex)(o):"0x",s??"0x",c?(0,p.numberToHex)(c):"0x",n??"0x"];if(t){let e=(()=>{if(t.v>=35n)return(t.v-35n)/2n>0?t.v:27n+(35n===t.v?0n:1n);if(r>0)return BigInt(2*r)+BigInt(35n+t.v-27n);let e=27n+(27n===t.v?0n:1n);if(t.v!==e)throw new h.InvalidLegacyVError({v:t.v});return e})(),o=(0,w.trim)(t.r),n=(0,w.trim)(t.s);m=[...m,(0,p.numberToHex)(e),"0x00"===o?"0x":o,"0x00"===n?"0x":n]}else r>0&&(m=[...m,(0,p.numberToHex)(r),"0x","0x"]);return(0,u.toRlp)(m)}(e,t)}function A(e,t){let r=t??e,{v:o,yParity:n}=r;if(void 0===r.r||void 0===r.s||void 0===o&&void 0===n)return[];let a=(0,w.trim)(r.r),s=(0,w.trim)(r.s);return["number"==typeof n?n?(0,p.numberToHex)(1):"0x":0n===o?"0x":1n===o?(0,p.numberToHex)(1):27n===o?"0x":(0,p.numberToHex)(1),"0x00"===a?"0x":a,"0x00"===s?"0x":s]}function j(e,t){var r;return"deposit"===(r=e).type||void 0!==r.sourceHash?function(e){!function(e){let{from:t,to:r}=e;if(t&&!(0,l.isAddress)(t))throw new i.InvalidAddressError({address:t});if(r&&!(0,l.isAddress)(r))throw new i.InvalidAddressError({address:r})}(e);let{sourceHash:t,data:r,from:o,gas:n,isSystemTx:a,mint:s,to:h,value:d}=e,m=[t,o,h??"0x",s?(0,p.toHex)(s):"0x",d?(0,p.toHex)(d):"0x",n?(0,p.toHex)(n):"0x",a?"0x1":"0x",r??"0x"];return(0,c.concatHex)(["0x7e",(0,u.toRlp)(m)])}(e):O(e,t)}e.s(["serializeAccessList",0,P],621490);let B={transaction:j};e.s(["serializeTransaction",0,j,"serializers",0,B],141942);let _={blockTime:2e3,contracts:t,formatters:s,serializers:B};e.s(["chainConfig",0,_],86479);var R=e.i(538463);let E=(0,R.defineChain)({..._,id:84532,network:"base-sepolia",name:"Base Sepolia",nativeCurrency:{name:"Sepolia Ether",symbol:"ETH",decimals:18},rpcUrls:{default:{http:["https://sepolia.base.org"]}},blockExplorers:{default:{name:"Basescan",url:"https://sepolia.basescan.org",apiUrl:"https://api-sepolia.basescan.org/api"}},contracts:{..._.contracts,disputeGameFactory:{0xaa36a7:{address:"0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1"}},l2OutputOracle:{0xaa36a7:{address:"0x84457ca9D0163FbC4bbfe4Dfbb20ba46e48DF254"}},portal:{0xaa36a7:{address:"0x49f53e41452c74589e85ca1677426ba426459e85",blockCreated:4446677}},l1StandardBridge:{0xaa36a7:{address:"0xfd0Bf71F60660E2f608ed56e1659C450eB113120",blockCreated:4446677}},multicall3:{address:"0xca11bde05977b3631167028862be2a173976ca11",blockCreated:1059647}},testnet:!0,sourceId:0xaa36a7}),S=(0,R.defineChain)({...E,experimental_preconfirmationTime:200,rpcUrls:{default:{http:["https://sepolia-preconf.base.org"]}}});e.s(["baseSepolia",0,E,"baseSepoliaPreconf",0,S],881837)},544636,e=>{"use strict";e.i(247167);var t=e.i(843476),r=e.i(574983),o=e.i(110163),n=e.i(881837),a=e.i(619273),s=e.i(286491),i=e.i(540143),l=e.i(915823),c=class extends l.Subscribable{constructor(e={}){super(),this.config=e,this.#e=new Map}#e;build(e,t,r){let o=t.queryKey,n=t.queryHash??(0,a.hashQueryKeyByOptions)(o,t),i=this.get(n);return i||(i=new s.Query({client:e,queryKey:o,queryHash:n,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(o)}),this.add(i)),i}add(e){this.#e.has(e.queryHash)||(this.#e.set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){let t=this.#e.get(e.queryHash);t&&(e.destroy(),t===e&&this.#e.delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){i.notifyManager.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return this.#e.get(e)}getAll(){return[...this.#e.values()]}find(e){let t={exact:!0,...e};return this.getAll().find(e=>(0,a.matchQuery)(t,e))}findAll(e={}){let t=this.getAll();return Object.keys(e).length>0?t.filter(t=>(0,a.matchQuery)(e,t)):t}notify(e){i.notifyManager.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){i.notifyManager.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){i.notifyManager.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},p=e.i(114272),u=l,h=class extends u.Subscribable{constructor(e={}){super(),this.config=e,this.#t=new Set,this.#r=new Map,this.#o=0}#t;#r;#o;build(e,t,r){let o=new p.Mutation({client:e,mutationCache:this,mutationId:++this.#o,options:e.defaultMutationOptions(t),state:r});return this.add(o),o}add(e){this.#t.add(e);let t=d(e);if("string"==typeof t){let r=this.#r.get(t);r?r.push(e):this.#r.set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(this.#t.delete(e)){let t=d(e);if("string"==typeof t){let r=this.#r.get(t);if(r)if(r.length>1){let t=r.indexOf(e);-1!==t&&r.splice(t,1)}else r[0]===e&&this.#r.delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){let t=d(e);if("string"!=typeof t)return!0;{let r=this.#r.get(t),o=r?.find(e=>"pending"===e.state.status);return!o||o===e}}runNext(e){let t=d(e);if("string"!=typeof t)return Promise.resolve();{let r=this.#r.get(t)?.find(t=>t!==e&&t.state.isPaused);return r?.continue()??Promise.resolve()}}clear(){i.notifyManager.batch(()=>{this.#t.forEach(e=>{this.notify({type:"removed",mutation:e})}),this.#t.clear(),this.#r.clear()})}getAll(){return Array.from(this.#t)}find(e){let t={exact:!0,...e};return this.getAll().find(e=>(0,a.matchMutation)(t,e))}findAll(e={}){return this.getAll().filter(t=>(0,a.matchMutation)(e,t))}notify(e){i.notifyManager.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){let e=this.getAll().filter(e=>e.state.isPaused);return i.notifyManager.batch(()=>Promise.all(e.map(e=>e.continue().catch(a.noop))))}};function d(e){return e.options.scope?.id}var m=e.i(175555),y=e.i(814448);function f(e){return{onFetch:(t,r)=>{let o=t.options,n=t.fetchOptions?.meta?.fetchMore?.direction,s=t.state.data?.pages||[],i=t.state.data?.pageParams||[],l={pages:[],pageParams:[]},c=0,p=async()=>{let r=!1,p=(0,a.ensureQueryFn)(t.options,t.fetchOptions),u=async(e,o,n)=>{let s;if(r)return Promise.reject();if(null==o&&e.pages.length)return Promise.resolve(e);let i=(s={client:t.client,queryKey:t.queryKey,pageParam:o,direction:n?"backward":"forward",meta:t.options.meta},(0,a.addConsumeAwareSignal)(s,()=>t.signal,()=>r=!0),s),l=await p(i),{maxPages:c}=t.options,u=n?a.addToStart:a.addToEnd;return{pages:u(e.pages,l,c),pageParams:u(e.pageParams,o,c)}};if(n&&s.length){let e="backward"===n,t={pages:s,pageParams:i},r=(e?function(e,{pages:t,pageParams:r}){return t.length>0?e.getPreviousPageParam?.(t[0],t,r[0],r):void 0}:w)(o,t);l=await u(t,r,e)}else{let t=e??s.length;do{let e=0===c?i[0]??o.initialPageParam:w(o,l);if(c>0&&null==e)break;l=await u(l,e),c++}while(c<t)}return l};t.options.persister?t.fetchFn=()=>t.options.persister?.(p,{client:t.client,queryKey:t.queryKey,meta:t.options.meta,signal:t.signal},r):t.fetchFn=p}}}function w(e,{pages:t,pageParams:r}){let o=t.length-1;return t.length>0?e.getNextPageParam(t[o],t,r[o],r):void 0}var b=class{#n;#a;#s;#i;#l;#c;#p;#u;constructor(e={}){this.#n=e.queryCache||new c,this.#a=e.mutationCache||new h,this.#s=e.defaultOptions||{},this.#i=new Map,this.#l=new Map,this.#c=0}mount(){this.#c++,1===this.#c&&(this.#p=m.focusManager.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#n.onFocus())}),this.#u=y.onlineManager.subscribe(async e=>{e&&(await this.resumePausedMutations(),this.#n.onOnline())}))}unmount(){this.#c--,0===this.#c&&(this.#p?.(),this.#p=void 0,this.#u?.(),this.#u=void 0)}isFetching(e){return this.#n.findAll({...e,fetchStatus:"fetching"}).length}isMutating(e){return this.#a.findAll({...e,status:"pending"}).length}getQueryData(e){let t=this.defaultQueryOptions({queryKey:e});return this.#n.get(t.queryHash)?.state.data}ensureQueryData(e){let t=this.defaultQueryOptions(e),r=this.#n.build(this,t),o=r.state.data;return void 0===o?this.fetchQuery(e):(e.revalidateIfStale&&r.isStaleByTime((0,a.resolveStaleTime)(t.staleTime,r))&&this.prefetchQuery(t),Promise.resolve(o))}getQueriesData(e){return this.#n.findAll(e).map(({queryKey:e,state:t})=>[e,t.data])}setQueryData(e,t,r){let o=this.defaultQueryOptions({queryKey:e}),n=this.#n.get(o.queryHash),s=n?.state.data,i=(0,a.functionalUpdate)(t,s);if(void 0!==i)return this.#n.build(this,o).setData(i,{...r,manual:!0})}setQueriesData(e,t,r){return i.notifyManager.batch(()=>this.#n.findAll(e).map(({queryKey:e})=>[e,this.setQueryData(e,t,r)]))}getQueryState(e){let t=this.defaultQueryOptions({queryKey:e});return this.#n.get(t.queryHash)?.state}removeQueries(e){let t=this.#n;i.notifyManager.batch(()=>{t.findAll(e).forEach(e=>{t.remove(e)})})}resetQueries(e,t){let r=this.#n;return i.notifyManager.batch(()=>(r.findAll(e).forEach(e=>{e.reset()}),this.refetchQueries({type:"active",...e},t)))}cancelQueries(e,t={}){let r={revert:!0,...t};return Promise.all(i.notifyManager.batch(()=>this.#n.findAll(e).map(e=>e.cancel(r)))).then(a.noop).catch(a.noop)}invalidateQueries(e,t={}){return i.notifyManager.batch(()=>(this.#n.findAll(e).forEach(e=>{e.invalidate()}),e?.refetchType==="none")?Promise.resolve():this.refetchQueries({...e,type:e?.refetchType??e?.type??"active"},t))}refetchQueries(e,t={}){let r={...t,cancelRefetch:t.cancelRefetch??!0};return Promise.all(i.notifyManager.batch(()=>this.#n.findAll(e).filter(e=>!e.isDisabled()&&!e.isStatic()).map(e=>{let t=e.fetch(void 0,r);return r.throwOnError||(t=t.catch(a.noop)),"paused"===e.state.fetchStatus?Promise.resolve():t}))).then(a.noop)}fetchQuery(e){let t=this.defaultQueryOptions(e);void 0===t.retry&&(t.retry=!1);let r=this.#n.build(this,t);return r.isStaleByTime((0,a.resolveStaleTime)(t.staleTime,r))?r.fetch(t):Promise.resolve(r.state.data)}prefetchQuery(e){return this.fetchQuery(e).then(a.noop).catch(a.noop)}fetchInfiniteQuery(e){return e.behavior=f(e.pages),this.fetchQuery(e)}prefetchInfiniteQuery(e){return this.fetchInfiniteQuery(e).then(a.noop).catch(a.noop)}ensureInfiniteQueryData(e){return e.behavior=f(e.pages),this.ensureQueryData(e)}resumePausedMutations(){return y.onlineManager.isOnline()?this.#a.resumePausedMutations():Promise.resolve()}getQueryCache(){return this.#n}getMutationCache(){return this.#a}getDefaultOptions(){return this.#s}setDefaultOptions(e){this.#s=e}setQueryDefaults(e,t){this.#i.set((0,a.hashKey)(e),{queryKey:e,defaultOptions:t})}getQueryDefaults(e){let t=[...this.#i.values()],r={};return t.forEach(t=>{(0,a.partialMatchKey)(e,t.queryKey)&&Object.assign(r,t.defaultOptions)}),r}setMutationDefaults(e,t){this.#l.set((0,a.hashKey)(e),{mutationKey:e,defaultOptions:t})}getMutationDefaults(e){let t=[...this.#l.values()],r={};return t.forEach(t=>{(0,a.partialMatchKey)(e,t.mutationKey)&&Object.assign(r,t.defaultOptions)}),r}defaultQueryOptions(e){if(e._defaulted)return e;let t={...this.#s.queries,...this.getQueryDefaults(e.queryKey),...e,_defaulted:!0};return t.queryHash||(t.queryHash=(0,a.hashQueryKeyByOptions)(t.queryKey,t)),void 0===t.refetchOnReconnect&&(t.refetchOnReconnect="always"!==t.networkMode),void 0===t.throwOnError&&(t.throwOnError=!!t.suspense),!t.networkMode&&t.persister&&(t.networkMode="offlineFirst"),t.queryFn===a.skipToken&&(t.enabled=!1),t}defaultMutationOptions(e){return e?._defaulted?e:{...this.#s.mutations,...e?.mutationKey&&this.getMutationDefaults(e.mutationKey),...e,_defaulted:!0}}clear(){this.#n.clear(),this.#a.clear()}},g=e.i(912598),x=e.i(722652);let k=(0,x.getDefaultConfig)({appName:"AgentAuth",projectId:"demo_project_id",chains:[n.baseSepolia],transports:{[n.baseSepolia.id]:(0,o.http)()}}),v=new b;e.s(["Providers",0,function({children:e}){return(0,t.jsx)(r.WagmiProvider,{config:k,children:(0,t.jsx)(g.QueryClientProvider,{client:v,children:(0,t.jsx)(x.RainbowKitProvider,{children:e})})})}],544636)},101139,e=>{e.v(t=>Promise.all(["static/chunks/0o5lqqhyk3.-6.js"].map(t=>e.l(t))).then(()=>t(109963)))},389892,e=>{e.v(e=>Promise.resolve().then(()=>e(337575)))},66216,e=>{e.v(t=>Promise.all(["static/chunks/0pthc5l9cbzw9.js","static/chunks/0wp8mqkizl-.6.js","static/chunks/0~i8lmtnwf-x3.js"].map(t=>e.l(t))).then(()=>t(477350)))},224814,e=>{e.v(t=>Promise.all(["static/chunks/00yso5b_qxnb2.js","static/chunks/03k2v0mh.e~iz.js"].map(t=>e.l(t))).then(()=>t(653806)))},470308,e=>{e.v(t=>Promise.all(["static/chunks/12a22s7suwl5-.js"].map(t=>e.l(t))).then(()=>t(915618)))},474683,e=>{e.v(t=>Promise.all(["static/chunks/0dch4n740u~ks.js"].map(t=>e.l(t))).then(()=>t(289329)))},381024,e=>{e.v(t=>Promise.all(["static/chunks/02.xi11dt61va.js","static/chunks/16clgskujizix.js"].map(t=>e.l(t))).then(()=>t(607627)))},114544,e=>{e.v(t=>Promise.all(["static/chunks/0lcds04g_cnax.js"].map(t=>e.l(t))).then(()=>t(64871)))},199160,e=>{e.v(t=>Promise.all(["static/chunks/0rkeeqvuk3~8m.js"].map(t=>e.l(t))).then(()=>t(552117)))},458488,e=>{e.v(t=>Promise.all(["static/chunks/03nz1t1~je8ay.js"].map(t=>e.l(t))).then(()=>t(828419)))},945205,e=>{e.v(t=>Promise.all(["static/chunks/0kby~d5u_h6.d.js"].map(t=>e.l(t))).then(()=>t(216419)))},669023,e=>{e.v(t=>Promise.all(["static/chunks/16-ewnnddw645.js"].map(t=>e.l(t))).then(()=>t(739776)))},469689,e=>{e.v(t=>Promise.all(["static/chunks/0arcnwxxwzbga.js"].map(t=>e.l(t))).then(()=>t(356290)))},760813,e=>{e.v(t=>Promise.all(["static/chunks/0~.wkpjbrendb.js"].map(t=>e.l(t))).then(()=>t(252306)))},423705,e=>{e.v(t=>Promise.all(["static/chunks/0tkel~fok.j1-.js"].map(t=>e.l(t))).then(()=>t(997708)))},736057,e=>{e.v(t=>Promise.all(["static/chunks/04yrg4w~syyhq.js"].map(t=>e.l(t))).then(()=>t(905405)))},917507,e=>{e.v(t=>Promise.all(["static/chunks/0uoyqj-ea.tr9.js"].map(t=>e.l(t))).then(()=>t(70881)))},82058,e=>{e.v(t=>Promise.all(["static/chunks/083yyycd2lkiu.js"].map(t=>e.l(t))).then(()=>t(945467)))},984221,e=>{e.v(t=>Promise.all(["static/chunks/079motw3h.8go.js"].map(t=>e.l(t))).then(()=>t(657990)))},281312,e=>{e.v(t=>Promise.all(["static/chunks/0ikci1qs3-03f.js"].map(t=>e.l(t))).then(()=>t(737224)))},581928,e=>{e.v(t=>Promise.all(["static/chunks/0242d84yh0xm9.js"].map(t=>e.l(t))).then(()=>t(887256)))},784600,e=>{e.v(t=>Promise.all(["static/chunks/0-cdz6i.wt97d.js"].map(t=>e.l(t))).then(()=>t(220519)))},290491,e=>{e.v(t=>Promise.all(["static/chunks/0dqbtk.gcz1ei.js"].map(t=>e.l(t))).then(()=>t(162088)))},435239,e=>{e.v(t=>Promise.all(["static/chunks/0nsmnt0vhmc.d.js"].map(t=>e.l(t))).then(()=>t(771650)))},917421,e=>{e.v(t=>Promise.all(["static/chunks/0a9ejy8btz1ho.js"].map(t=>e.l(t))).then(()=>t(157677)))},391110,e=>{e.v(t=>Promise.all(["static/chunks/08-t3lejra3jb.js"].map(t=>e.l(t))).then(()=>t(210006)))},442086,e=>{e.v(t=>Promise.all(["static/chunks/0g7fm8gt..98a.js"].map(t=>e.l(t))).then(()=>t(67881)))},105872,e=>{e.v(t=>Promise.all(["static/chunks/12koe_9mr03u9.js"].map(t=>e.l(t))).then(()=>t(864976)))},271711,e=>{e.v(t=>Promise.all(["static/chunks/08ile.d8vj.pp.js"].map(t=>e.l(t))).then(()=>t(29311)))},567031,e=>{e.v(t=>Promise.all(["static/chunks/0dq199iufv4jn.js"].map(t=>e.l(t))).then(()=>t(75789)))},575685,e=>{e.v(t=>Promise.all(["static/chunks/0so1vf9oehdax.js"].map(t=>e.l(t))).then(()=>t(786882)))},604414,e=>{e.v(t=>Promise.all(["static/chunks/0n~2yrimttwn2.js"].map(t=>e.l(t))).then(()=>t(352164)))},777210,e=>{e.v(t=>Promise.all(["static/chunks/0wmvm_0zyyd6y.js"].map(t=>e.l(t))).then(()=>t(745141)))},230454,e=>{e.v(t=>Promise.all(["static/chunks/0za6-_ttbpd8w.js"].map(t=>e.l(t))).then(()=>t(516267)))},80911,e=>{e.v(t=>Promise.all(["static/chunks/0uhk86c-hy0tz.js"].map(t=>e.l(t))).then(()=>t(138783)))},197615,e=>{e.v(t=>Promise.all(["static/chunks/0aunq7q-g7r76.js"].map(t=>e.l(t))).then(()=>t(540804)))},485284,e=>{e.v(t=>Promise.all(["static/chunks/0cc70wpw7~luc.js"].map(t=>e.l(t))).then(()=>t(303962)))},346977,e=>{e.v(t=>Promise.all(["static/chunks/01-ugct-maooj.js"].map(t=>e.l(t))).then(()=>t(370564)))},736033,e=>{e.v(t=>Promise.all(["static/chunks/11azsbqgfvf49.js"].map(t=>e.l(t))).then(()=>t(472299)))},557289,e=>{e.v(t=>Promise.all(["static/chunks/14lcb121r0i93.js"].map(t=>e.l(t))).then(()=>t(920685)))},649149,e=>{e.v(t=>Promise.all(["static/chunks/0bo_bm7eqauj..js"].map(t=>e.l(t))).then(()=>t(418891)))},9974,e=>{e.v(t=>Promise.all(["static/chunks/106mor.t9~qbx.js"].map(t=>e.l(t))).then(()=>t(761011)))},485155,e=>{e.v(t=>Promise.all(["static/chunks/16onyth9hm0xp.js"].map(t=>e.l(t))).then(()=>t(421618)))},759968,e=>{e.v(t=>Promise.all(["static/chunks/0id6b9d.vb4t7.js"].map(t=>e.l(t))).then(()=>t(251012)))},38898,e=>{e.v(t=>Promise.all(["static/chunks/169cixy8qcofj.js"].map(t=>e.l(t))).then(()=>t(900368)))},822574,e=>{e.v(t=>Promise.all(["static/chunks/16m.6h6i_~fmo.js"].map(t=>e.l(t))).then(()=>t(248530)))},101716,e=>{e.v(t=>Promise.all(["static/chunks/0p0y2jrsubf58.js"].map(t=>e.l(t))).then(()=>t(839444)))},24530,e=>{e.v(t=>Promise.all(["static/chunks/0.ajt94w-80q_.js"].map(t=>e.l(t))).then(()=>t(723557)))},768769,e=>{e.v(t=>Promise.all(["static/chunks/09dml_sxxjk21.js"].map(t=>e.l(t))).then(()=>t(880804)))},667285,e=>{e.v(t=>Promise.all(["static/chunks/12pio3cwb_aja.js"].map(t=>e.l(t))).then(()=>t(804453)))},193126,e=>{e.v(t=>Promise.all(["static/chunks/0ot8la1jad0p5.js"].map(t=>e.l(t))).then(()=>t(973024)))},708036,e=>{e.v(t=>Promise.all(["static/chunks/0az40_5pt4bp9.js"].map(t=>e.l(t))).then(()=>t(481675)))},811338,e=>{e.v(t=>Promise.all(["static/chunks/0w4bee3d4a1ye.js"].map(t=>e.l(t))).then(()=>t(385710)))},321625,e=>{e.v(t=>Promise.all(["static/chunks/0cgw7mh2s~o58.js"].map(t=>e.l(t))).then(()=>t(656395)))},345304,e=>{e.v(t=>Promise.all(["static/chunks/0zw_ul6xixtw8.js"].map(t=>e.l(t))).then(()=>t(382042)))},738278,e=>{e.v(t=>Promise.all(["static/chunks/0op0e5o0dmn-2.js"].map(t=>e.l(t))).then(()=>t(619124)))},792872,e=>{e.v(t=>Promise.all(["static/chunks/0xbqobhcv8l~v.js"].map(t=>e.l(t))).then(()=>t(371659)))},226755,e=>{e.v(t=>Promise.all(["static/chunks/17k2-c05s6jo..js"].map(t=>e.l(t))).then(()=>t(446495)))},504937,e=>{e.v(t=>Promise.all(["static/chunks/0drmj._841x7d.js"].map(t=>e.l(t))).then(()=>t(156255)))},410758,e=>{e.v(t=>Promise.all(["static/chunks/0ye~0cg96bl-m.js"].map(t=>e.l(t))).then(()=>t(908254)))},886422,e=>{e.v(t=>Promise.all(["static/chunks/0wnasi6cuopdp.js"].map(t=>e.l(t))).then(()=>t(652860)))},274604,e=>{e.v(t=>Promise.all(["static/chunks/0eedautr6-mm-.js"].map(t=>e.l(t))).then(()=>t(505209)))},426975,e=>{e.v(t=>Promise.all(["static/chunks/0ycia2hy0.0m9.js"].map(t=>e.l(t))).then(()=>t(6938)))},106369,e=>{e.v(t=>Promise.all(["static/chunks/080rsw22ijqcs.js"].map(t=>e.l(t))).then(()=>t(358134)))},507518,e=>{e.v(t=>Promise.all(["static/chunks/0yda0m0qrcbi9.js"].map(t=>e.l(t))).then(()=>t(221274)))},396057,e=>{e.v(t=>Promise.all(["static/chunks/08o853owt42at.js"].map(t=>e.l(t))).then(()=>t(432867)))},192150,e=>{e.v(t=>Promise.all(["static/chunks/0wuriu45mgw_h.js"].map(t=>e.l(t))).then(()=>t(42941)))},703354,e=>{e.v(t=>Promise.all(["static/chunks/13q.o3h3_x9ji.js"].map(t=>e.l(t))).then(()=>t(185157)))},422316,e=>{e.v(t=>Promise.all(["static/chunks/11iroaqit0ttv.js"].map(t=>e.l(t))).then(()=>t(460012)))},932219,e=>{e.v(t=>Promise.all(["static/chunks/0ixrtdjw9o45v.js"].map(t=>e.l(t))).then(()=>t(467138)))},437039,e=>{e.v(t=>Promise.all(["static/chunks/08js3wc~_92d6.js"].map(t=>e.l(t))).then(()=>t(21043)))},31273,e=>{e.v(t=>Promise.all(["static/chunks/0o~29sg8m86io.js"].map(t=>e.l(t))).then(()=>t(444733)))},812921,e=>{e.v(t=>Promise.all(["static/chunks/0~x9my6bn4wd0.js"].map(t=>e.l(t))).then(()=>t(327052)))},93305,e=>{e.v(t=>Promise.all(["static/chunks/0a0.xi1--r136.js"].map(t=>e.l(t))).then(()=>t(823233)))},65212,e=>{e.v(t=>Promise.all(["static/chunks/0z~qniu99cq-w.js"].map(t=>e.l(t))).then(()=>t(879917)))},961315,e=>{e.v(t=>Promise.all(["static/chunks/1321gb9i5oedl.js"].map(t=>e.l(t))).then(()=>t(4245)))},588300,e=>{e.v(t=>Promise.all(["static/chunks/16qtj.-~.tq3_.js"].map(t=>e.l(t))).then(()=>t(227574)))},782184,e=>{e.v(t=>Promise.all(["static/chunks/0ndq~_x.ycfyg.js"].map(t=>e.l(t))).then(()=>t(956007)))},20651,e=>{e.v(t=>Promise.all(["static/chunks/10ljx8go-4h5..js"].map(t=>e.l(t))).then(()=>t(150676)))},254566,e=>{e.v(t=>Promise.all(["static/chunks/05gimknjitcjp.js"].map(t=>e.l(t))).then(()=>t(164540)))},873830,e=>{e.v(t=>Promise.all(["static/chunks/0.uw7hut0dxyk.js"].map(t=>e.l(t))).then(()=>t(631690)))},554610,e=>{e.v(t=>Promise.all(["static/chunks/0tt01qjl02mmp.js"].map(t=>e.l(t))).then(()=>t(93227)))}]);