import React from "react";

export const Companies = () => {
  return (
    <section className="py-12 bg-background/5">
      <div className="container max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="md:w-1/3">
            <h4 className="text-lg md:text-lg font-medium text-left">
              Trusted by fast-growing <br/> companies around the world
            </h4>
          </div>
          <div className="md:w-2/3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center justify-center p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                  <img
                    src={`https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//${i + 1}.svg`}
                    alt={`Partner ${i + 1}`}
                    className="h-8 w-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
