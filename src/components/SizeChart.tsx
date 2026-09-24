import React from 'react';
import { SIZE_CHART } from '../data/products';
import { Ruler } from 'lucide-react';

interface SizeChartProps {
  title?: string;
  subtitle?: string;
}

export const SizeChart: React.FC<SizeChartProps> = ({
  title = 'সাইজ চার্ট (Size Chart)',
  subtitle = 'আপনার সঠিক মাপ দেখে নিচে অর্ডার ফর্মে সাইজ সিলেক্ট করুন (সব মাপ ইঞ্চিতে)',
}) => {
  return (
    <section className="mx-2 sm:mx-4 mb-6">
      {/* Title */}
      <div className="flex items-center justify-center gap-1.5 mb-1.5 text-center">
        <Ruler className="w-4 h-4 text-pink-400" />
        <h3 className="font-['Baloo_Da_2'] text-xl sm:text-2xl font-bold text-white">
          {title}
        </h3>
      </div>
      <p className="text-center text-neutral-400 text-[11px] sm:text-xs mb-3">
        {subtitle}
      </p>

      {/* Compact Size Chart Card - perfectly fits 100% on mobile without horizontal scroll */}
      <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-slate-200">
        <table className="w-full table-fixed border-collapse text-center">
          {/* Header */}
          <thead>
            <tr className="bg-[#092247] text-white font-bold text-[10px] sm:text-xs md:text-sm uppercase tracking-tight">
              <th className="w-[18%] py-2 sm:py-2.5 px-0.5 border-r border-[#153463]">
                <span className="inline-block relative pb-0.5">
                  SIZE
                  <span className="block w-4 sm:w-5 h-[1.5px] bg-sky-400 mx-auto mt-0.5 rounded-full"></span>
                </span>
              </th>
              <th className="w-[19%] py-2 sm:py-2.5 px-0.5 border-r border-[#153463]">
                <span className="inline-block relative pb-0.5">
                  CHEST
                  <span className="block w-4 sm:w-5 h-[1.5px] bg-sky-400 mx-auto mt-0.5 rounded-full"></span>
                </span>
              </th>
              <th className="w-[21%] py-2 sm:py-2.5 px-0.5 border-r border-[#153463]">
                <span className="inline-block relative pb-0.5">
                  SHOULDER
                  <span className="block w-4 sm:w-5 h-[1.5px] bg-sky-400 mx-auto mt-0.5 rounded-full"></span>
                </span>
              </th>
              <th className="w-[19%] py-2 sm:py-2.5 px-0.5 border-r border-[#153463]">
                <span className="inline-block relative pb-0.5">
                  LENGTH
                  <span className="block w-4 sm:w-5 h-[1.5px] bg-sky-400 mx-auto mt-0.5 rounded-full"></span>
                </span>
              </th>
              <th className="w-[23%] py-2 sm:py-2.5 px-0.5">
                <span className="inline-block relative pb-0.5 leading-tight">
                  <span className="block sm:inline">SLEEVE</span>{' '}
                  <span className="block sm:inline">LENGTH</span>
                  <span className="block w-4 sm:w-5 h-[1.5px] bg-sky-400 mx-auto mt-0.5 rounded-full"></span>
                </span>
              </th>
            </tr>
          </thead>

          {/* Rows - Compact vertical height */}
          <tbody className="divide-y divide-[#d8e4f5]">
            {SIZE_CHART.map((row, idx) => {
              const isEven = idx % 2 === 1;

              return (
                <tr
                  key={row.size}
                  className={isEven ? 'bg-[#f4f8ff]' : 'bg-white'}
                >
                  {/* Size Pill */}
                  <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 border-r border-[#d8e4f5]">
                    <div className="flex items-center justify-center">
                      <span className="inline-block w-9 sm:w-12 py-0.5 rounded-md sm:rounded-lg font-extrabold text-xs sm:text-sm bg-[#092247] text-white shadow-xs">
                        {row.size}
                      </span>
                    </div>
                  </td>

                  {/* Chest */}
                  <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 text-[#092247] font-bold text-xs sm:text-sm md:text-base border-r border-[#d8e4f5]">
                    {row.chest}
                  </td>

                  {/* Shoulder */}
                  <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 text-[#092247] font-bold text-xs sm:text-sm md:text-base border-r border-[#d8e4f5]">
                    {row.shoulder}
                  </td>

                  {/* Length */}
                  <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 text-[#092247] font-bold text-xs sm:text-sm md:text-base border-r border-[#d8e4f5]">
                    {row.length}
                  </td>

                  {/* Sleeve Length */}
                  <td className="py-1.5 sm:py-2 px-0.5 sm:px-1 text-[#092247] font-bold text-xs sm:text-sm md:text-base">
                    {row.sleeveLength}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
