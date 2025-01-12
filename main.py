import sys
import cv2
# sys.path.append('old_numpy')
import numpy as np
from pathlib import Path
from ultralytics import YOLO
from PIL import Image
from utils.predict_bounding_boxes import predict_bounding_boxes
from utils.translate_manga import translate_manga
from utils.process_contour import process_contour
from utils.write_text_on_image import add_text
import manga_ocr
import logging


def translate_image(input_path, output_path, model_path="best.pt"):
    # Initialize models
    object_detection_model = YOLO(model_path)
    logging.getLogger("manga_ocr").setLevel(logging.WARNING)

    # If transformers logs are still appearing, suppress their logs as well
    logging.getLogger("transformers").setLevel(logging.ERROR)

    mocr = manga_ocr.MangaOcr()

    # Load the image
    image = Image.open(input_path)
    image = np.array(image)

    # Predict bounding boxes
    results = predict_bounding_boxes(object_detection_model, input_path)
    total_boxes = len(results)
    if total_boxes == 0:
        print("PROGRESS:100",flush=True)
        print(f"Warning: No Bounding Boxes detected in {input_path}")
        print(f"Saved translated image to {output_path}")
        cv2.imwrite(output_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
        return

    for idx,result in enumerate(results,start=1):
        x1, y1, x2, y2, score, class_id = result
        detected_image = image[int(y1):int(y2), int(x1):int(x2)]
        im = Image.fromarray(np.uint8((detected_image) * 255))
        text = mocr(im)
        detected_image, cont = process_contour(detected_image)
        text_translated = translate_manga(text)

        if text_translated is None:
            print(f"Warning: Translation failed for text '{text}'")
            text_translated = "Translation unavailable"
        else:
            add_text(detected_image, text_translated, cont)
        
        progress = int((idx / total_boxes)*100)
        print(f"PROGRESS:{progress}",flush=True)
        sys.stdout.flush()

    # Save the translated image
    cv2.imwrite(output_path, cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
    print("PROGRESS:100",flush=True)
    print(f"Saved translated image to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python main.py <input_image_path> <output_image_path>")
        sys.exit(1)

    input_image_path = sys.argv[1]
    output_image_path = sys.argv[2]
    translate_image(input_image_path, output_image_path)