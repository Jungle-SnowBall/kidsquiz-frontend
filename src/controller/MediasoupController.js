import { io } from "socket.io-client";
import socket from "../liveComponents/socketExport";
import * as mediasoupClient from "mediasoup-client";


// console.log("미디어숲 socket", socket)

//익스포트 함수
export const getSocket = () => {
  return socket;
};

export const getSocketName = () => {
  const guestNameTemp = localStorage.getItem("guestName");
  return guestNameTemp ? guestNameTemp : "선생";
};

const MediasoupController = () => {
  //비디오 소스 임시로 담아둘 것
  let tempVideoId;
  let guestRoducerId = [];
  //호스트라면 userName은 호스트 이름, 게스트라면 게스트 이름

  let params = {
    // mediasoup params
    encodings: [
      {
        rid: "r0",
        maxBitrate: 100000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r1",
        maxBitrate: 300000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r2",
        maxBitrate: 900000,
        scalabilityMode: "S1T3",
      },
    ],
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };



  const initCall = async () => {
    //로컬에서 hostName, guestName hostBool을 가져온다.
    const hostName = localStorage.getItem("name");
    const guestName = localStorage.getItem("guestName");
    let hostBool = localStorage.getItem("hostBool");

    let userName = guestName;
    if (hostBool) {
      userName = hostName;
    } else {
      hostBool = false;
    }
    // console.log("userName", userName, "hostBool", hostBool);

    //석규추가
    const hostNameLine = document.getElementById("localUserName");

    hostNameLine.innerHTML = userName;
    //석규추가 끝

    //방이름
    const roomName = localStorage.getItem("roomName");
    let device;
    let rtpCapabilities;
    let producerTransport;
    let consumerTransports = [];
    let audioProducer;
    let videoProducer;
    const videoContainer = document.getElementById("videoContainer");


    
    //! 1.가장 먼저 실행되는 함수 ( io()로 서버에 소켓 연결이 되면 서버의 emit에 의해 가장 먼저 호출된다. )
    socket.on("connection-success", ({ socketId }) => {
      console.log("🚀🚀🚀🚀🚀 내 소켓 아이디", socket.id)
      getLocalStream();
    });

    // //! 2. 1번에서 호출되어 두번째로 실행되는 함수
    const getLocalStream = () => {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: {
            width: {
              min: 640,
              max: 1920,
            },
            height: {
              min: 400,
              max: 1080,
            },
          },
        })
        .then(streamSuccess)
        .catch((error) => {
          console.log(error.message);
        });
    };

    let audioParams;
    let videoParams = { params };
    let consumingTransports = [];

    let myStream;
    // 성공적으로 미디어를 가져온 경우에 실행됨
    //!3. 2번에서 성공적으로 미디어를 가져오면 실행되는 함수
    const streamSuccess = (stream) => {

      //id가 hostMe인 태그를 가져온다.
      const hostMe = document.getElementById("hostMe"); //추가한거
      const guestMeWrap = document.getElementById("guestMeWrap"); //추가한거
      const guestMe = document.getElementById("guestMe"); //추가한거
      
      myStream = stream;

      const hostName = document.getElementById("hostName"); //추가한거
      const hostCol = document.getElementById("hostCol"); //추가한거

      function myAudioController() {
        if (this.className === "off") {
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
              this.innerHTML=svg
              this.className="on"
        }
        else {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>`
          this.innerHTML=svg
          this.className="off"
        }
        stream.getAudioTracks().forEach((track) => {(track.enabled = !track.enabled);}) 
    }  
      function myVideoController() {
        if (this.className === "off") {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1zM4 5h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2z"/></svg>`
          this.innerHTML=svg
          this.className="on"
        }
        else {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l19.8 19.8M15 15.7V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h.3m5.4 0H13a2 2 0 0 1 2 2v3.3l1 1L22 7v10"/></svg>`
          this.innerHTML=svg
          this.className="off"
        }
        stream.getVideoTracks().forEach((track) => {(track.enabled = !track.enabled);}) 
    }  

      if (hostBool) {
        hostMe.srcObject = stream;

        // 기존의 게스트 창은 안쓴 거니까 visibility none으로 처리 
        guestMeWrap.setAttribute("visibility", "none");
        guestMeWrap.style.display = "none"; 

        hostName.innerText = `${userName} 선생님`;
        const mute = document.getElementById("hostMemute"); //추가한거
        const camera = document.getElementById("hostMecamera"); //추가한거
        mute.addEventListener("click", myAudioController)
        camera.addEventListener("click", myVideoController)
                 
      } else {
        guestMe.srcObject = stream;

        const mute = document.getElementById("guestMemute"); //추가한거
        const camera = document.getElementById("guestMecamera"); //추가한거
        mute.addEventListener("click", myAudioController)
        camera.addEventListener("click", myVideoController)
      }
      //! ... 문법은 audioParams, videoParams의 주소가 아닌 '값'만 가져온다는 의미!
      audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
      videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

      joinRoom();
    };

    //! 4. 3번에서 유저 미디어를 잘 받아서 비디오로 송출한 후에 호출되는 함수. 이 함수를 통해 실제 room에 조인하게 된다.
    const joinRoom = () => {
      socket.emit("joinRoom", roomName, userName, hostBool, (data) => {
        // console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
        // we assign to local variable and will be used when loading the client Device (see createDevice above)
        rtpCapabilities = data.rtpCapabilities;
        // once we have rtpCapabilities from the Router, create Device
        createDevice();
      });
    };

    // }
    //! 5. 4번에서 room에 조인하고 router rtpCapabilities를 받아온 후 실행되는 함수. Device 객체를 생성한다.
    const createDevice = async () => {
      try {
        device = new mediasoupClient.Device();

        // Loads the device with RTP capabilities of the Router (server side)
        await device.load({
          // see getRtpCapabilities() below
          routerRtpCapabilities: rtpCapabilities,
        });

        // console.log('Device RTP Capabilities', device.rtpCapabilities)

        // once the device loads, create transport
        createSendTransport();
      } catch (error) {
        console.log(error);
        if (error.name === "UnsupportedError")
          console.warn("browser not supported");
      }
    };

    //! 6. 5번에서 Device 객체를 생성하고나서 호출되느 함수. 비디오를 송출하기 위해 클라이언트 측 SEND Transport 를 생성한다.
    const createSendTransport = () => {
      // see server's socket.on('createWebRtcTransport', sender?, ...)
      // this is a call from Producer, so sender = true
      //! 방에 조인할 때는 아직 다른 producer가 있는지 모르는 상태 -> 우선은 consumer를 false로 한다.
      //! 방에 다른 참여자(producer)가 있다면 그때서야 recv transport를 생성하고 그때  consumer:true가 된다.
      //! 그 작업은 signalNewConsumerTransport 에서 하게 됨 :-)
      socket.emit(
        "createWebRtcTransport",
        { consumer: false },
        ({ params }) => {
          // The server sends back params needed
          // to create Send Transport on the client side
          if (params.error) {
            console.log(params.error);
            return;
          }

          // console.log(params)

          // creates a new WebRTC Transport to send media
          // based on the server's producer transport params

          producerTransport = device.createSendTransport(params);

          // this event is raised when a first call to transport.produce() is made
          // see connectSendTransport() below
          //!! producer client가 SEND Trnasport(LP)의 메서드 produce 메서드를 호출하면 connect 이벤트와 produce 이벤트가 발생됨 
          producerTransport.on(
            "connect",
            async ({ dtlsParameters }, callback, errback) => {
              try {
                // Signal local DTLS parameters to the server side transport
                // see server's socket.on('transport-connect', ...)
                await socket.emit("transport-connect", {
                  dtlsParameters,
                });

                // Tell the transport that parameters were transmitted.
                //! transport에 parameters들이 전송되었다는 것을 알려주는 역할!
                callback();
              } catch (error) {
                errback(error);
              }
            }
          );
          // producer client가 SEND Trnasport(LP)의 메서드 produce 메서드를 호출하면 connect 이벤트와 produce 이벤트가 발생됨 
          producerTransport.on(
            "produce",
            async (parameters, callback, errback) => {
              // console.log(parameters)
              // console.log("produce 이벤트가 발생하였습니다!", parameters)

              try {
                // tell the server to create a Producer
                // with the following parameters and produce
                // and expect back a server side producer id
                // see server's socket.on('transport-produce', ...)
                await socket.emit(
                  "transport-produce",
                  {
                    kind: parameters.kind,
                    rtpParameters: parameters.rtpParameters,
                    appData: parameters.appData,
                    mysocket: socket.id
                  },
                  ({ id, producersExist }) => {
                    // Tell the transport that parameters were transmitted and provide it with the
                    //! server side producer's id.
                    callback({ id });

                    // if producers exist, then join room
                    if (producersExist) getProducers();
                  }
                );
              } catch (error) {
                errback(error);
              }
            }
          );

          connectSendTransport();
        }
      );
    };

    //! 7. 6번에서 SEND transport를 생성한 후 connect 하기 위해 호출되는 함수
    const connectSendTransport = async () => {
      // we now call produce() to instruct the producer transport
      // to send media to the Router

      // this action will trigger the 'connect' and 'produce' events above
      audioProducer = await producerTransport.produce(audioParams);
      videoProducer = await producerTransport.produce(videoParams);

      audioProducer.on("trackended", () => {
        console.log("audio track ended");

        // close audio track
      });

      audioProducer.on("transportclose", () => {
        console.log("audio transport ended");

        // close audio track
      });

      videoProducer.on("trackended", () => {
        console.log("video track ended");

        // close video track
      });

      videoProducer.on("transportclose", () => {
        console.log("video transport ended");

        // close video track
      });
    };

    //! 8 6번에서 방에 입장했을 때 이미 다른 참여자들이 있는 경우 실행됨
    const getProducers = () => {
      
      socket.emit("getProducers", (producerList) => {
        // for each of the producer create a consumer
        producerList.forEach((id) => {
          signalNewConsumerTransport(id[0], id[1], id[2], id[3]);
        });

        // producerIds.forEach(signalNewConsumerTransport)
      });
    };

    //! 새 참여자 발생시 또는 8번에서 호출됨   1. ** 정해진 순서는 없고, new-producer 이벤트가 발생하면 호출되는 함수
    const signalNewConsumerTransport = async (
      remoteProducerId,
      socketName,
      newSocketId,
      isNewSocketHost
    ) => {
      //check if we are already consuming the remoteProducerId
      if (consumingTransports.includes(remoteProducerId)) return;
      consumingTransports.push(remoteProducerId);

      await socket.emit(
        "createWebRtcTransport",
        { consumer: true },
        ({ params }) => {
          // The server sends back params needed
          // to create Send Transport on the client side
          if (params.error) {
            console.log(params.error);
            return;
          }
          // console.log(`PARAMS... ${params}`)

          let consumerTransport;
          try {
            consumerTransport = device.createRecvTransport(params);
          } catch (error) {
            // exceptions:
            // {InvalidStateError} if not loaded
            // {TypeError} if wrong arguments.
            console.log(error);
            return;
          }

          consumerTransport.on(
            "connect",
            async ({ dtlsParameters }, callback, errback) => {
              try {
                // Signal local DTLS parameters to the server side transport
                // see server's socket.on('transport-recv-connect', ...)
                await socket.emit("transport-recv-connect", {
                  dtlsParameters,
                  serverConsumerTransportId: params.id,
                });

                // Tell the transport that parameters were transmitted.
                callback();
              } catch (error) {
                // Tell the transport that something was wrong
                errback(error);
              }
            }
          );

          connectRecvTransport(
            consumerTransport,
            remoteProducerId,
            params.id,
            socketName,
            newSocketId,
            isNewSocketHost
          );
        }
      );
    };

    // server informs the client of a new producer just joined
    // 새로운 producer가 있다고 서버가 알려주는 경우!
    socket.on(
      "new-producer",
      ({ producerId, socketName, socketId, isNewSocketHost }) => {
        signalNewConsumerTransport(
          producerId,
          socketName,
          socketId,
          isNewSocketHost
        );
      }
    );

    //!새 참여자 발생시 2. 1번함수에서 호출되는 함수 -> 여기서 실질적으로 새로운 html 요소가 만들어지고 비디오 스트림을 받아옴
    const connectRecvTransport = async (
      consumerTransport,
      remoteProducerId,
      serverConsumerTransportId,
      socketName,
      newSocketId,
      isNewSocketHost
    ) => {
      // for consumer, we need to tell the server first
      // to create a consumer based on the rtpCapabilities and consume
      // if the router can consume, it will send back a set of params as below

      //소켓내임이 있으면 소켓 네임으로 없으면 유저네임

      await socket.emit(
        "consume",
        {
          rtpCapabilities: device.rtpCapabilities,
          remoteProducerId,
          serverConsumerTransportId,
        },
        async ({ params }) => {
          if (params.error) {
            console.log("Cannot Consume");
            return;
          }

          // console.log(`Consumer Params ${params}`)
          // then consume with the local consumer transport
          // which creates a consumer
          const consumer = await consumerTransport.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters,
          });

          consumerTransports = [
            ...consumerTransports,
            {
              consumerTransport,
              serverConsumerTransportId: params.id,
              producerId: remoteProducerId,
              consumer,
            },
        ]
        

        // destructure and retrieve the video track from the producer
        const { track } = consumer
        console.log("새 소켓은 host인가? ", isNewSocketHost)
        
        // console.log("cameraBtn!!", cameraBtn)

          //! 새 소켓이 선생님인 경우 -> 선생님 칸으로 srcObject 넣어주기
          if (isNewSocketHost) {
            // 선생님에게 들어가야해
            const hostMe = document.getElementById("hostMe"); //추가한거
            const hostName = document.getElementById("hostName"); //추가한거
            const hostMeAudio = document.getElementById("hostMeAudio"); //추가한거
            if (track.kind === "audio") {
              hostMeAudio.srcObject = new MediaStream([track]);
            }
            else {
              hostMe.srcObject = new MediaStream([track]);
            }
            hostName.innerText = `${socketName} 선생님`;
          }
          //! 그렇지 않은 경우 학생 요소로 넣어주기!
          else {
            // create a new div element for the new consumer media
            // console.log("params.kind 는 ", params.kind, "remoteProducerId는 ", remoteProducerId)

            if (params.kind === "audio") {
              //! 항상 오디오 요청이 먼저 들어옴. 따라서 모든 새 태그는 오디오일 때만 만들고, 비디오일때는 오디오에서 생성한 것을 찾아서 사용한다. 
              const wrapper = document.createElement("div"); //상위 div (이 안에 오디오, 비디오, micAndVid div 까지 들어가게 될 것)
              wrapper.setAttribute("id", `td-${remoteProducerId}`);
              wrapper.setAttribute("class", newSocketId);
            
              const audio = document.createElement("audio") //! 오디오 태그 생성하고, 속성 설정한 후 srcObject에 스트림 넣어준다
              // const video = document.createElement("video") //???
              // video.srcObject = new MediaStream([track]) //???

              // audio.setAttribute("id", remoteProducerId) //? 굳이 필요 없을듯???
              audio.setAttribute("autoplay", "true")
              wrapper.appendChild(audio)
              
              audio.srcObject = new MediaStream([track])
              videoContainer.appendChild(wrapper)

              // wrapper.innerHTML =
              //   '<audio id="' + remoteProducerId + '" autoplay></audio>';
            } else {
              const existingWrapper = document.getElementsByClassName(newSocketId)[0]
              const video = document.createElement("video")
              // const video = existingWrapper.getElementsByTagName("video") //???
              
              video.setAttribute("id", remoteProducerId) 
              video.setAttribute("autoplay", "true")
              existingWrapper.appendChild(video)
              video.srcObject = new MediaStream([track])

              const newElem = document.createElement("div"); // 비디오, 오디오 화면
              newElem.setAttribute("class", "controllers")
              newElem.innerHTML =
              '<div class="micAndVid"> <p class="guestNameDisplay">"' +  socketName +
               '"</p> <button id="' + newSocketId + '-mute" class="off"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg></button><button id="' 
               + newSocketId + '-camera" class="off"> <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l19.8 19.8M15 15.7V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h.3m5.4 0H13a2 2 0 0 1 2 2v3.3l1 1L22 7v10"/></svg></button></div></div> '
               existingWrapper.appendChild(newElem)
            // }

            // document.getElementById(remoteProducerId).srcObject = new MediaStream([track])
            
            //!버튼 이벤트리스너
            
            let muteBtn = document.getElementById(newSocketId+'-mute')
            let cameraBtn = document.getElementById(newSocketId+'-camera')
            
            if (cameraBtn){
                cameraBtn.addEventListener('click', async (e) => {
                  let camCheck = cameraBtn.className
                  if (camCheck === 'off') {
                      cameraBtn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.6 11.6L22 7v10l-6.4-4.5v-1zM4 5h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2z"/></svg>`
                      cameraBtn.setAttribute("class", "on")

                      let tempSocket = e.target.id.replace('-camera', '');//e.srcElement.id 뒤에 camera 택스트 제거
                      socket.emit("video-out",{
                          studentSocketId: tempSocket,
                          on : false,
                      })
                      // console.log("socket event video-out 완료 ")

                      
                  } else {
                    cameraBtn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l19.8 19.8M15 15.7V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7c0-1.1.9-2 2-2h.3m5.4 0H13a2 2 0 0 1 2 2v3.3l1 1L22 7v10"/></svg>`
                    cameraBtn.setAttribute("class", "off")
                      //e.srcElement.id 뒤에 camera 택스트 제거
                      let tempSocket = e.target.id.replace('-camera', '');
                      socket.emit("video-out",{
                          studentSocketId: tempSocket,
                          on : true,
                      })
                  }
                })
            }
 
            if (muteBtn){
              muteBtn.addEventListener('click', async (e) => {
                  console.log("mute 버튼 클릭했어요!!!! 현재 상태는 : ", muteBtn.className)
                  if (muteBtn.className === 'off') {
                      // 소리를 꺼야해! 
                      muteBtn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
                      muteBtn.setAttribute("class", "on")
                      
                      //e.srcElement.id 뒤에 camera 택스트 제거
                      let tempSocket = e.target.id.replace('-mute', '');
                      //console.log("조용히 시킬 소켓: ", tempSocket)
                      socket.emit('audio-out',{
                          studentSocketId: tempSocket,
                          on : false,
                      })
                      
                  } else {
                      muteBtn.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"/></svg>`
                      muteBtn.setAttribute("class", "off")
                    //e.srcElement.id 뒤에 camera 택스트 제거
                    let tempSocket = e.target.id.replace("-mute", "");
                    //console.log("다시 말하게 해줄 소켓: ", tempSocket)
  
                    socket.emit("audio-out", {
                      studentSocketId: tempSocket,
                      on: true,
                    });
                  }
              })
          }
            // document.getElementById(remoteProducerId).srcObject = new MediaStream([track])

        }
      } //!!!?!?!?!??!

        await socket.on('student-video-controller', ( on ) => {
            myStream
            .getVideoTracks()
            .forEach((track) => {
                (track.enabled = on.on);                    
            }); 
            console.log("현재 비디오 상태: ", on)
            // 카메라 화면 요소를 키고 끄기 
        })

        await socket.on('student-audio-controller', ( on ) => {
          console.log(socket.id, " 마이크 ", on.on ," 하겠습니다. ")
            myStream
            .getAudioTracks()
            .forEach((track) => {
                (track.enabled = on.on);                    
            }); 
            console.log("현재 오디오 상태: ", on)
            // 마이크 화면 요소를 키고 끄기 
        })
        
        // the server consumer started with media paused
        // so we need to inform the server to resume
        socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
        })
    }

    //! 누군가가 연결 종료될 때 발생 -> 해당 비디오 요소가 제거된다.
    socket.on("producer-closed", ({ remoteProducerId }) => {
      // server notification is received when a producer is closed
      // we need to close the client-side consumer and associated transport
      const producerToClose = consumerTransports.find(
        (transportData) => transportData.producerId === remoteProducerId
      );
      producerToClose.consumerTransport.close();
      producerToClose.consumer.close();

      // remove the consumer transport from the list
      consumerTransports = consumerTransports.filter(
        (transportData) => transportData.producerId !== remoteProducerId
      );

      // remove the video div element
      //todo! 여기 뭔가 수정 필요..
      videoContainer.removeChild(
        document.getElementById(`td-${remoteProducerId}`)
      );
    });
  };

  return {
    init: () => {
      initCall();
    },
  };
};

export default MediasoupController;