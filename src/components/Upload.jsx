import React, { useState, useEffect, useRef } from "react";
import exifr from "exifr";
import { saveAs } from "file-saver";

const Upload = () => {
  const [images, setImages] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [aperture, setAperture] = useState("N/A");
  const [imageSets, setImageSets] = useState([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [batchCount, setBatchCount] = useState(1);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const [batchDirectoryHandle, setBatchDirectoryHandle] = useState(null);
  const [rejectFolderHandle, setRejectFolderHandle] = useState(null);
  const [folderSelected, setFolderSelected] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    const fetchAperture = async () => {
      if (selectedImageIndex !== null && images.length > 0) {
        const imageFile = images[selectedImageIndex].file;
        if (imageFile) {
          try {
            const tags = await exifr.parse(imageFile);
            const apertureValue = tags?.FNumber;
            if (apertureValue) {
              setAperture(`f/${apertureValue.toFixed(1)}`);
            } else {
              setAperture("N/A");
            }
          } catch (error) {
            console.error("Error parsing EXIF data:", error);
            setAperture("N/A");
          }
        }
      }
    };

    fetchAperture();
  }, [selectedImageIndex, images]);

  useEffect(() => {
    const tempImageSets = [];
    for (let i = 0; i < images.length; i += 8) {
      tempImageSets.push(images.slice(i, i + 8));
    }
    setImageSets(tempImageSets);
  }, [images]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!buttonsDisabled && selectedImageIndex !== null) {
        const currentSet = imageSets[currentSetIndex];
        const currentSetStart = currentSetIndex * 8;
        const currentSetEnd = currentSetStart + 8;
        let newIndex = selectedImageIndex;

        switch (event.key) {
          case "ArrowLeft":
            newIndex =
              newIndex === currentSetStart ? currentSetEnd - 1 : newIndex - 1;
            break;
          case "ArrowRight":
            newIndex =
              newIndex === currentSetEnd - 1 ? currentSetStart : newIndex + 1;
            break;
          case "a":
          case "A":
            handleAccept();
            break;
          case "r":
          case "R":
            handleReject();
            break;
          default:
            break;
        }

        setSelectedImageIndex(newIndex);
      }
    };
    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [buttonsDisabled, selectedImageIndex, imageSets, currentSetIndex, handleAccept, handleReject]);

  const handleImageUpload = async (event) => {
    const files = event.target.files;

    if (files.length === 0) return;

    const fileList = Array.from(files);

    const imageFiles = fileList.filter((file) =>
      file.type.startsWith("image/")
    );

    setImageSets([]);
    setImages([]);

    imageFiles.forEach((file) => {
      setImages((prevImages) => [
        ...prevImages,
        { url: URL.createObjectURL(file), file: file },
      ]);
    });
  };

  const handlePreviousSet = () => {
    setCurrentSetIndex((prevIndex) =>
      prevIndex === imageSets.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleNextSet = () => {
    setCurrentSetIndex((prevIndex) =>
      prevIndex === 0 ? imageSets.length - 1 : prevIndex - 1
    );
  };

  const handlePreviousImage = () => {
    if (imageSets[currentSetIndex].length > 0) {
      setSelectedImageIndex((prevIndex) =>
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
      updateCurrentSetIndex(
        selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1
      );
    }
  };

  const handleNextImage = () => {
    if (imageSets[currentSetIndex].length > 0) {
      setSelectedImageIndex((prevIndex) =>
        prevIndex === images.length - 1 ? 0 : prevIndex + 1
      );
      updateCurrentSetIndex(
        selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1
      );
    }
  };

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    updateCurrentSetIndex(index);
  };

  const updateCurrentSetIndex = (index) => {
    const newSetIndex = Math.floor(index / 8);
    setCurrentSetIndex(newSetIndex);
  };

  const handleAccept = async () => {
    if (selectedImageIndex !== null && imageSets.length > 0) {
      const currentSet = imageSets[currentSetIndex];

      if (!batchDirectoryHandle) {
        const batchDirectoryHandle = await window.showDirectoryPicker();
        setBatchDirectoryHandle(batchDirectoryHandle);
        setFolderSelected(true);
      }

      const batchDirectory = await batchDirectoryHandle.getDirectoryHandle(
        `Batch_${batchCount}`,
        { create: true }
      );

      for (const image of currentSet) {
        const fileHandle = await batchDirectory.getFileHandle(
          image.file.name,
          {
            create: true,
          }
        );
        const writable = await fileHandle.createWritable();
        await fetch(image.url)
          .then((response) => response.blob())
          .then((blob) => writable.write(blob))
          .then(() => writable.close());
      }

      setBatchCount((prevCount) => prevCount + 1);

      // Set the selected image index to the first image of the next set
      setSelectedImageIndex(currentSetIndex * 8);

      // Remove the current set from imageSets
      setImageSets((prevSets) => {
        const newSets = [...prevSets];
        newSets.splice(currentSetIndex, 1);
        return newSets.length > 0 ? newSets : []; // Ensure imageSets is not empty
      });
    } else {
      alert("There are no images to accept.");
    }
  };

  const saveBatch = async () => {
    const currentSet = imageSets[currentSetIndex];
    const batchFolder = `Batch_${batchCount}`;

    if (!folderSelected) {
      const batchDirectoryHandle = await window.showDirectoryPicker();
      setBatchDirectoryHandle(batchDirectoryHandle);
      setFolderSelected(true);
    }

    const batchDirectory = await batchDirectoryHandle.getDirectoryHandle(
      batchFolder,
      { create: true }
    );

    for (const image of currentSet) {
      const fileHandle = await batchDirectory.getFileHandle(
        image.file.name,
        {
          create: true,
        }
      );
      const writable = await fileHandle.createWritable();
      await fetch(image.url)
        .then((response) => response.blob())
        .then((blob) => writable.write(blob))
        .then(() => writable.close());
    }

    setBatchCount((prevCount) => prevCount + 1);
  };

  const handleReject = async () => {
    if (selectedImageIndex !== null && imageSets.length > 0) {
      const currentSet = imageSets[currentSetIndex];

      if (!rejectFolderHandle) {
        const rejectFolderHandle = await window.showDirectoryPicker();
        setRejectFolderHandle(rejectFolderHandle);
        setRejectFolderSelected(true);
      }

      const rejectFolder = await rejectFolderHandle.getDirectoryHandle(
        "Reject",
        { create: true }
      );

      for (const image of currentSet) {
        const fileHandle = await rejectFolder.getFileHandle(
          image.file.name,
          {
            create: true,
          }
        );
        const writable = await fileHandle.createWritable();
        await fetch(image.url)
          .then((response) => response.blob())
          .then((blob) => writable.write(blob))
          .then(() => writable.close());
      }

      // Set the selected image index to the first image of the next set
      setSelectedImageIndex(currentSetIndex * 8);

      // Remove the current set from imageSets
      setImageSets((prevSets) => {
        const newSets = [...prevSets];
        newSets.splice(currentSetIndex, 1);
        return newSets.length > 0 ? newSets : []; // Ensure imageSets is not empty
      });
    } else {
      alert("There are no images to reject.");
    }
  };

  const filteredImages = imageSets.flat();

  const setStartIndex = currentSetIndex * 8;

  return (
    <div
      className="container mt-0 mx-auto my-20 flex flex-col lg:flex-row"
      tabIndex={0}
    >
      <div className="lg:w-1/3 overflow-y-auto h-screen max-h-full relative">
        <div className="h-full">
          <input
            type="file"
            accept="image/*"
            webkitdirectory=""
            onChange={handleImageUpload}
            className="border border-gray-400 py-2 px-4 rounded-md mb-4"
            tabIndex={0}
          />
          <div className="grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-8 gap-4">
            {filteredImages.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image.url}
                  alt={`Image ${index}`}
                  className="w-full h-auto cursor-pointer"
                  onClick={() => handleImageClick(index)}
                  tabIndex={0}
                />
                {selectedImageIndex === index && (
                  <p className="absolute top-0 left-0 bg-black text-white p-2">
                    Aperture: {aperture}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="lg:w-2/3 overflow-hidden lg:h-screen max-h-full relative ">
        {selectedImageIndex !== null && (
          <div className="relative">
            <img
              src={filteredImages[selectedImageIndex].url}
              alt={`Selected Image`}
              className="w-full h-auto cursor-pointer"
              onClick={() => handleImageClick(selectedImageIndex)}
              tabIndex={0}
            />
            <div className="absolute top-0 left-0 bg-black text-white p-2">
              Aperture: {aperture}
            </div>
            <div className="absolute top-[50] left-0 w-full flex justify-around p-6">
              {filteredImages
                .slice(setStartIndex, setStartIndex + 8)
                .map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={`Set Image ${index}`}
                    className="w-12 h-12 cursor-pointer"
                    onClick={() => handleImageClick(setStartIndex + index)}
                    tabIndex={0}
                  />
                ))}
            </div>

            <div className="absolute bottom-5 right-0 flex justify-between p-4">
              <button
                onClick={handlePreviousImage}
                className={`${
                  buttonsDisabled ? "cursor-not-allowed" : ""
                } bg-gray-500 text-white py-2 px-4 rounded-md mr-4 hover:bg-gray-600`}
                disabled={buttonsDisabled}
              >
                Previous Image
              </button>
              <button
                onClick={handleNextImage}
                className={`${
                  buttonsDisabled ? "cursor-not-allowed" : ""
                } bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600`}
                disabled={buttonsDisabled}
              >
                Next Image
              </button>
            </div>
          </div>
        )}
        <div className="lg:absolute bottom-5 right-0 flex justify-between p-4">
          <button
            onClick={handleAccept}
            className={`${
              buttonsDisabled ? "cursor-not-allowed" : ""
            } bg-green-500 text-white py-2 px-4 rounded-md mr-4 hover:shadow-md hover:bg-gradient-to-r from-green-600 to-yellow-200`}
            disabled={buttonsDisabled}
          >
            ACCEPT SET
          </button>
          <button
            onClick={handleReject}
            className={`${
              buttonsDisabled ? "cursor-not-allowed" : ""
            } bg-red-500 text-white py-2 px-4 rounded-md hover:shadow-md hover:bg-gradient-to-r to-red-600 from-pink-300`}
            disabled={buttonsDisabled}
          >
            REJECT SET
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upload;
