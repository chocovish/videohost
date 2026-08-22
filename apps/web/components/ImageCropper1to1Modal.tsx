"use client";

import React from "react";
import ImageCropperModal, { ImageCropperModalProps } from "./ImageCropperModal";

export type { ImageCropperModalProps as ImageCropper1to1ModalProps };

export default function ImageCropper1to1Modal(props: ImageCropperModalProps) {
  return <ImageCropperModal {...props} aspectRatio="1:1" />;
}
