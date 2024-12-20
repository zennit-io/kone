import {Drawer, DrawerContent} from "@zennui/native/drawer";
import {Text} from "@zennui/native/text";
import {H1, H3} from "@zennui/native/typography";
import {useEffect, useState} from "react";
import {StyleSheet} from "react-native";
import {Camera, runAtTargetFps, useCameraDevice, useCameraFormat, useFrameProcessor,} from "react-native-vision-camera";
import {useRunOnJS} from "react-native-worklets-core";
import {initLicense, recognize, updateTemplate, useCustomModel,} from "vision-camera-dynamsoft-label-recognizer";
import {Header} from "@/components/general/header";
import {field, FormSubmitButton, InferredForm} from "@zennui/native/form";
import {ScanIcon} from "@zennui/icons";
import {z} from "zod";
import {useRouter} from "expo-router";
import {useScannedInfo} from "@/components/providers/scanned-info";

const config = {
  name: field({
    shape: "text",
    constraint: z.string().min(1),
    label: "Name Building",
    placeholder: "e.g Kone Building No.9",
    classList: {
      label: "text-2xl",
      input: {
        root: "border-0 h-6 gap-0",
        input: "placeholder:text-foreground-dimmed/50 text-xl",
      },
    },
  }),
};
export default () => {
  console.log("hello here");
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [output, setOutput] = useScannedInfo();

  const router = useRouter();
  const handleScanSuccess = useRunOnJS((input: string[], base64?: string) => {
    console.log("input", input);
    if (input.length > 0) {
      setOutput((previousState = {}) => ({
        ...previousState,
        scannedValue: input.join("\n").trim(),
        photoBase64: base64,
      }));
      setIsScanningActive(false);
      router.push("/scanned-info");
    }
  }, []);
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (!isScanningActive) return;
      runAtTargetFps(1, () => {
        "worklet";
        const response = recognize(frame, {
          includeImageBase64: true,
        });
        const lines = response.results.flatMap((result) => result.lineResults);
        const data = lines.map(({ text }) => text);
        console.log("lines", lines);
        handleScanSuccess(data, response.imageBase64);
      });
    },
    [isScanningActive],
  );

  const device = useCameraDevice("back");
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1920, height: 1080 } },
    { fps: 30 },
  ]);

  useEffect(() => {
    (async () => {
      await initLicense(process.env.EXPO_PUBLIC_DYNAMOSOFT_KEY);
      await useCustomModel({
        customModelFolder: "MRZ",
        customModelFileNames: ["MRZ"],
      });
      await updateTemplate(
        /* json */ `{"CharacterModelArray":[{"DirectoryPath":"","Name":"MRZ"}],"LabelRecognizerParameterArray":[{"Name":"default","ReferenceRegionNameArray":["defaultReferenceRegion"],"CharacterModelName":"MRZ","LetterHeightRange":[5,1000,1],"LineStringLengthRange":[30,44],"LineStringRegExPattern":"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{0,26}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,26}<{0,26}){(30)}|([ACIV][A-Z<][A-Z<]{3}([A-Z<]{0,27}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,27}){(31)}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}([A-Z<]{0,35}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,35}<{0,35}){(39)}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}","MaxLineCharacterSpacing":130,"TextureDetectionModes":[{"Mode":"TDM_GENERAL_WIDTH_CONCENTRATION","Sensitivity":8}],"Timeout":9999}],"LineSpecificationArray":[{"BinarizationModes":[{"BlockSizeX":30,"BlockSizeY":30,"Mode":"BM_LOCAL_BLOCK","MorphOperation":"Close"}],"LineNumber":"","Name":"defaultTextArea->L0"}],"ReferenceRegionArray":[{"Localization":{"FirstPoint":[0,0],"SecondPoint":[100,0],"ThirdPoint":[100,100],"FourthPoint":[0,100],"MeasuredByPercentage":1,"SourceType":"LST_MANUAL_SPECIFICATION"},"Name":"defaultReferenceRegion","TextAreaNameArray":["defaultTextArea"]}],"TextAreaArray":[{"Name":"defaultTextArea","LineSpecificationNameArray":["defaultTextArea->L0"]}]}`,
      );
    })();
  }, []);

  if (!device) return <Text>No device</Text>;
  return (
    <>
      <Camera
        frameProcessor={frameProcessor}
        device={device}
        isActive={isScanningActive}
        format={format}
        style={StyleSheet.absoluteFill}
        pixelFormat="yuv"
      />
      <Header title="Scan Label" />
      <Drawer
        snapAt={"60%"}
        open={!isScanningActive && !output.scannedValue}
        scaleBackground={false}
      >
        <DrawerContent className="gap-8 px-6">
          <H1 className="text-center text-primary">Survey Location</H1>
          <InferredForm
            config={config}
            onSubmit={(data) => {
              setIsScanningActive(true);
              setOutput((previousState) => ({
                ...previousState,
                title: data.name,
              }));
            }}
          >
            <FormSubmitButton className="mt-12 h-14 flex-row">
              <ScanIcon className="size-8 text-foreground" />
              <H3 className={"text-white text-2xl font-normal"}>Scan Label</H3>
            </FormSubmitButton>
          </InferredForm>
        </DrawerContent>
      </Drawer>
    </>
  );
};

// import { View } from "react-native";
//
// export default () => <View />;
// import * as React from "react";
//
// import {
//   StyleSheet,
//   SafeAreaView,
//   Alert,
//   Modal,
//   Pressable,
//   Text,
//   View,
//   Platform,
//   Dimensions,
// } from "react-native";
// import {
//   recognize,
//   type ScanConfig,
//   type ScanRegion,
//   type DLRCharacherResult,
//   type DLRLineResult,
//   type DLRResult,
// } from "vision-camera-dynamsoft-label-recognizer";
// import * as DLR from "vision-camera-dynamsoft-label-recognizer";
// import {
//   Camera,
//   runAsync,
//   runAtTargetFps,
//   useCameraDevice,
//   useCameraDevices,
//   useCameraFormat,
//   useFrameProcessor,
// } from "react-native-vision-camera";
// import { Svg, Image, Rect, Circle } from "react-native-svg";
// import { Worklets, useSharedValue } from "react-native-worklets-core";
// import { useEffect } from "react";
//
// const RecognizedCharacter = (props: { char: DLRCharacherResult }) => {
//   if (props.char.characterHConfidence > 50) {
//     return <Text style={[styles.modalText]}>{props.char.characterH}</Text>;
//   } else {
//     return (
//       <Text style={[styles.modalText, styles.lowConfidenceText]}>
//         {props.char.characterH}
//       </Text>
//     );
//   }
// };
//
// const scanRegion: ScanRegion = {
//   left: 5,
//   top: 40,
//   width: 90,
//   height: 10,
// };
//
// export default function ScannerScreen({ route }) {
//   const [imageData, setImageData] = React.useState(
//     undefined as undefined | string,
//   );
//   const [isActive, setIsActive] = React.useState(true);
//   const [modalVisible, setModalVisible] = React.useState(false);
//   const modalVisibleShared = useSharedValue(false);
//   const mounted = useSharedValue(false);
//   const [hasPermission, setHasPermission] = React.useState(false);
//   const [frameWidth, setFrameWidth] = React.useState(1280);
//   const [frameHeight, setFrameHeight] = React.useState(720);
//   const [recognitionResults, setRecognitionResults] = React.useState(
//     [] as DLRLineResult[],
//   );
//   const device = useCameraDevice("back");
//   const format = useCameraFormat(device, [
//     { videoResolution: { width: 1920, height: 1080 } },
//     { fps: 30 },
//   ]);
//   useEffect(() => {
//     (async () => {
//       "worklet";
//       console.log("mounted");
//       const status = await Camera.requestCameraPermission();
//       setHasPermission(status === "granted");
//       const result = await DLR.initLicense(
//         process.env.EXPO_PUBLIC_DYNAMOSOFT_KEY,
//       );
//       if (result === false) {
//         Alert.alert("Error", "License invalid");
//       }
//
//       try {
//         console.log("mrz use case");
//         await DLR.useCustomModel({
//           customModelFolder: "MRZ",
//           customModelFileNames: ["MRZ"],
//         });
//         await DLR.updateTemplate(
//           '{"CharacterModelArray":[{"DirectoryPath":"","Name":"MRZ"}],"LabelRecognizerParameterArray":[{"Name":"default","ReferenceRegionNameArray":["defaultReferenceRegion"],"CharacterModelName":"MRZ","LetterHeightRange":[5,1000,1],"LineStringLengthRange":[30,44],"LineStringRegExPattern":"([ACI][A-Z<][A-Z<]{3}[A-Z0-9<]{9}[0-9][A-Z0-9<]{15}){(30)}|([0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z<]{3}[A-Z0-9<]{11}[0-9]){(30)}|([A-Z<]{0,26}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,26}<{0,26}){(30)}|([ACIV][A-Z<][A-Z<]{3}([A-Z<]{0,27}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,27}){(31)}){(36)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{8}){(36)}|([PV][A-Z<][A-Z<]{3}([A-Z<]{0,35}[A-Z]{1,3}[(<<)][A-Z]{1,3}[A-Z<]{0,35}<{0,35}){(39)}){(44)}|([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[A-Z0-9<]{2}){(44)}","MaxLineCharacterSpacing":130,"TextureDetectionModes":[{"Mode":"TDM_GENERAL_WIDTH_CONCENTRATION","Sensitivity":8}],"Timeout":9999}],"LineSpecificationArray":[{"BinarizationModes":[{"BlockSizeX":30,"BlockSizeY":30,"Mode":"BM_LOCAL_BLOCK","MorphOperation":"Close"}],"LineNumber":"","Name":"defaultTextArea->L0"}],"ReferenceRegionArray":[{"Localization":{"FirstPoint":[0,0],"SecondPoint":[100,0],"ThirdPoint":[100,100],"FourthPoint":[0,100],"MeasuredByPercentage":1,"SourceType":"LST_MANUAL_SPECIFICATION"},"Name":"defaultReferenceRegion","TextAreaNameArray":["defaultTextArea"]}],"TextAreaArray":[{"Name":"defaultTextArea","LineSpecificationNameArray":["defaultTextArea->L0"]}]}',
//         );
//       } catch (error) {
//         console.log(error);
//         Alert.alert("Error", "Failed to load model.");
//       }
//
//       mounted.value = true;
//     })();
//     return () => {
//       console.log("unmounted");
//       mounted.value = false;
//       modalVisibleShared.value = false;
//       setIsActive(false);
//     };
//   }, []);
//
//   const getText = () => {
//     let text = "";
//     recognitionResults.forEach((result) => {
//       text = text + result.text + "\n";
//     });
//     return text.trim();
//   };
//
//   const renderImage = () => {
//     if (imageData) {
//       return (
//         <Svg style={styles.srcImage} viewBox={getViewBoxForCroppedImage()}>
//           <Image href={{ uri: imageData }} />
//           {charactersSVG("char", 0, 0)}
//         </Svg>
//       );
//     }
//     return null;
//   };
//
//   const charactersSVG = (prefix: string, offsetX: number, offsetY: number) => {
//     let characters: React.ReactElement[] = [];
//     let idx = 0;
//     recognitionResults.forEach((lineResult) => {
//       lineResult.characterResults.forEach((characterResult) => {
//         characters.push(
//           <Circle
//             key={prefix + idx}
//             cx={characterResult.location.points[0]!.x + offsetX}
//             cy={characterResult.location.points[3]!.y + offsetY + 4}
//             r="1"
//             stroke="blue"
//             fill="blue"
//           />,
//         );
//         idx = idx + 1;
//       });
//     });
//
//     if (characters.length > 0) {
//       return characters;
//     } else {
//       return null;
//     }
//   };
//
//   const getViewBox = () => {
//     const frameSize = getFrameSize();
//     const viewBox = "0 0 " + frameSize.width + " " + frameSize.height;
//     return viewBox;
//   };
//
//   const getViewBoxForCroppedImage = () => {
//     const frameSize = getFrameSize();
//     const viewBox =
//       "0 0 " +
//       (frameSize.width * scanRegion.width) / 100 +
//       " " +
//       (frameSize.height * scanRegion.height) / 100;
//     return viewBox;
//   };
//
//   const updateFrameSize = (width: number, height: number) => {
//     if (width != frameWidth && height != frameHeight) {
//       setFrameWidth(width);
//       setFrameHeight(height);
//     }
//   };
//
//   const getOffsetX = () => {
//     const frameSize = getFrameSize();
//     return (scanRegion.left / 100) * frameSize.width;
//   };
//
//   const getOffsetY = () => {
//     const frameSize = getFrameSize();
//     return (scanRegion.top / 100) * frameSize.height;
//   };
//
//   const getFrameSize = (): { width: number; height: number } => {
//     let width: number, height: number;
//     if (HasRotation()) {
//       width = frameHeight;
//       height = frameWidth;
//     } else {
//       width = frameWidth;
//       height = frameHeight;
//     }
//     return { width: width, height: height };
//   };
//
//   const HasRotation = () => {
//     let value = false;
//     if (frameWidth > frameHeight) {
//       if (Dimensions.get("window").width > Dimensions.get("window").height) {
//         value = false;
//       } else {
//         value = true;
//       }
//     } else if (frameWidth < frameHeight) {
//       if (Dimensions.get("window").width < Dimensions.get("window").height) {
//         value = false;
//       } else {
//         value = true;
//       }
//     }
//     return value;
//   };
//
//   const updateFrameSizeJS = Worklets.createRunOnJS(updateFrameSize);
//   const setImageDataJS = Worklets.createRunOnJS(setImageData);
//   const setRecognitionResultsJS = Worklets.createRunOnJS(setRecognitionResults);
//   const setModalVisibleJS = Worklets.createRunOnJS(setModalVisible);
//
//   const frameProcessor = useFrameProcessor((frame) => {
//     "worklet";
//     if (modalVisibleShared.value === false && mounted.value) {
//       runAsync(frame, () => {
//         "worklet";
//         updateFrameSizeJS(frame.width, frame.height);
//
//         let config: ScanConfig = {};
//
//         console.log("frame width:" + frame.width);
//         console.log("frame height:" + frame.height);
//         config.scanRegion = scanRegion;
//         config.includeImageBase64 = true;
//         let scanResult = recognize(frame, config);
//
//         let results: DLRResult[] = scanResult.results;
//         let lineResults: DLRLineResult[] = [];
//         for (let index = 0; index < results.length; index++) {
//           const result = results[index];
//           const lines = result?.lineResults;
//           if (lines) {
//             lines.forEach((line) => {
//               lineResults.push(line);
//             });
//           }
//         }
//
//         console.log(results);
//         if (modalVisibleShared.value === false) {
//           //check is modal visible again since the recognizing process takes time
//           if (lineResults.length >= 2) {
//             if (scanResult.imageBase64) {
//               console.log("has image: ");
//               setImageDataJS(
//                 "data:image/jpeg;base64," + scanResult.imageBase64,
//               );
//             }
//             setRecognitionResultsJS(lineResults);
//             modalVisibleShared.value = true;
//             setModalVisibleJS(true);
//           }
//         }
//       });
//     }
//   }, []);
//
//   return (
//     <SafeAreaView style={styles.container}>
//       {device != null && hasPermission && (
//         <>
//           <Camera
//             style={StyleSheet.absoluteFill}
//             device={device}
//             isActive={isActive}
//             frameProcessor={frameProcessor}
//             format={format}
//             pixelFormat="yuv"
//             resizeMode="contain"
//           ></Camera>
//           <Svg
//             preserveAspectRatio="xMidYMid slice"
//             style={StyleSheet.absoluteFill}
//             viewBox={getViewBox()}
//           >
//             <Rect
//               x={(scanRegion.left / 100) * getFrameSize().width}
//               y={(scanRegion.top / 100) * getFrameSize().height}
//               width={(scanRegion.width / 100) * getFrameSize().width}
//               height={(scanRegion.height / 100) * getFrameSize().height}
//               strokeWidth="2"
//               stroke="red"
//               fillOpacity={0.0}
//             />
//             {charactersSVG("char-cropped", getOffsetX(), getOffsetY())}
//           </Svg>
//         </>
//       )}
//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => {
//           Alert.alert("Modal has been closed.");
//           modalVisibleShared.value = !modalVisible;
//           setModalVisible(!modalVisible);
//           setRecognitionResults([]);
//         }}
//       >
//         <View style={styles.centeredView}>
//           <View style={styles.modalView}>
//             {renderImage()}
//             {recognitionResults.map((result) => (
//               <Text key={"line-" + result.location.points[0].x}>
//                 {result.characterResults.map((char) => (
//                   <RecognizedCharacter
//                     key={"rchar-" + char.location.points[0].x}
//                     char={char}
//                   />
//                 ))}
//               </Text>
//             ))}
//             <View style={styles.buttonView}>
//               <Pressable
//                 style={[styles.button, styles.buttonClose]}
//                 onPress={() => {
//                   modalVisibleShared.value = !modalVisible;
//                   setModalVisible(!modalVisible);
//                   setRecognitionResults([]);
//                 }}
//               >
//                 <Text style={styles.textStyle}>Rescan</Text>
//               </Pressable>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }
//
// const monospaceFontFamily = () => {
//   if (Platform.OS === "ios") {
//     return "Courier New";
//   } else {
//     return "monospace";
//   }
// };
//
// const getWindowWidth = () => {
//   return Dimensions.get("window").width;
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   box: {
//     width: 60,
//     height: 60,
//     marginVertical: 20,
//   },
//   centeredView: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     marginTop: 22,
//   },
//   modalView: {
//     margin: 20,
//     backgroundColor: "white",
//     borderRadius: 20,
//     padding: 35,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   buttonView: {
//     flexDirection: "row",
//   },
//   button: {
//     borderRadius: 20,
//     padding: 10,
//     margin: 5,
//   },
//   buttonOpen: {
//     backgroundColor: "#F194FF",
//   },
//   buttonClose: {
//     backgroundColor: "#2196F3",
//   },
//   textStyle: {
//     color: "white",
//     fontWeight: "bold",
//     textAlign: "center",
//   },
//   modalText: {
//     marginBottom: 10,
//     textAlign: "left",
//     fontSize: 12,
//     fontFamily: monospaceFontFamily(),
//   },
//   lowConfidenceText: {
//     color: "red",
//   },
//   srcImage: {
//     width: getWindowWidth() * 0.7,
//     height: 60,
//     resizeMode: "contain",
//   },
// });
