import blackImg from '../assets/images/ferrari_jacket_black_1790107270989.jpg';
import whiteImg from '../assets/images/ferrari_jacket_white_1790107289257.jpg';
import redImg from '../assets/images/ferrari_jacket_red_1790107301729.jpg';
import { ShirtProduct, ShirtSize } from '../types';

export const SHIRT_PRICE = 1650;
export const OLD_PRICE = 2950;

export const PRODUCTS: ShirtProduct[] = [
  {
    id: 'black',
    name: 'Black Ferrari Jacket',
    banglaName: 'Black',
    colorName: 'Black Ferrari Jacket',
    price: SHIRT_PRICE,
    originalPrice: OLD_PRICE,
    image: blackImg,
    altText: 'Black Ferrari Racing Jacket',
  },
  {
    id: 'white',
    name: 'White Ferrari Jacket',
    banglaName: 'White',
    colorName: 'White Ferrari Jacket',
    price: SHIRT_PRICE,
    originalPrice: OLD_PRICE,
    image: whiteImg,
    altText: 'White Ferrari Racing Jacket',
  },
  {
    id: 'red',
    name: 'Red Ferrari Jacket',
    banglaName: 'Red',
    colorName: 'Red Ferrari Jacket',
    price: SHIRT_PRICE,
    originalPrice: OLD_PRICE,
    image: redImg,
    altText: 'Rosso Red Ferrari Racing Jacket',
  },
];

export interface SizeChartRow {
  size: ShirtSize;
  chest: string;
  shoulder: string;
  length: string;
  sleeveLength: string;
}

export const SIZE_CHART: SizeChartRow[] = [
  { size: 'M', chest: '40', shoulder: '17.5', length: '27', sleeveLength: '24' },
  { size: 'L', chest: '42', shoulder: '18.5', length: '28', sleeveLength: '24.5' },
  { size: 'XL', chest: '44', shoulder: '19.5', length: '29', sleeveLength: '25' },
  { size: 'XXL', chest: '46', shoulder: '20.5', length: '30', sleeveLength: '25.5' },
  { size: '3XL', chest: '48', shoulder: '21.5', length: '31', sleeveLength: '26' },
  { size: '4XL', chest: '50', shoulder: '22.5', length: '32', sleeveLength: '26.5' },
];

export const WHATSAPP_NUMBER = '8801673154851';
export const DISPLAY_PHONE = '01673-154851';
