from typing import Tuple
import cv2
import numpy as np


def process_contour(image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    if len(image.shape) == 2 or image.shape[2] == 1:  # Grayscale image
        gray = image
    else:  # Color image
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    largest_contour = max(contours, key=cv2.contourArea)

    mask = np.zeros_like(gray)
    cv2.drawContours(mask, [largest_contour], -1, 255, cv2.FILLED)

    # Fill the detected contour area with white in the original image
    if len(image.shape) == 2 or image.shape[2] == 1:  # Grayscale image
        image[mask == 255] = 255
    else:  # Color image
        image[mask == 255] = (255, 255, 255)

    return image, largest_contour