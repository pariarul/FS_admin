"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import EditLeadership from "./components/EditLeaderships";
import LoadingAnimation from '../../components/loading-animation';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type Leader = {
  id: string;
  name: {
    en: string;
    zh: string;
    si: string;
  };
  role: {
    en: string;
    zh: string;
    si: string;
  };
  imagePath: string;
};

type LeadershipData = {
  heading: {
    en: string;
    zh: string;
    si: string;
  };
  title: {
    en: string;
    zh: string;
    si: string;
  };
  description: {
    en: string;
    zh: string;
    si: string;
  };
  btn: {
    en: string;
    zh: string;
    si: string;
  };
  leaders: Leader[];
};

const LeadershipPage = () => {
  const [leadershipData, setLeadershipData] = useState<LeadershipData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

useEffect(() => {
  const fetchLeadership = async () => {
    try {
      const res = await fetch(`${baseURL}/home/get-leadership-section`);

      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

      const json = await res.json();

      if (json?.success && json?.data) {
        const apiData = json.data;

        // if leaders empty create default
        if (!apiData.leaders || apiData.leaders.length === 0) {
          apiData.leaders = [
            {
              id: "1",
              name: { en: "", zh: "", si: "" },
              role: { en: "", zh: "", si: "" },
              imagePath: ""
            },
            {
              id: "2",
              name: { en: "", zh: "", si: "" },
              role: { en: "", zh: "", si: "" },
              imagePath: ""
            }
          ];
        }

        setLeadershipData(apiData);
      }
    } catch (error) {
      console.error("Error fetching leadership data:", error);
    }
  };

  fetchLeadership();
}, []);
  const handleSave = (updatedData: LeadershipData) => {
    setLeadershipData(updatedData);
    setIsEditing(false);
  };

  if (!leadershipData)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <LoadingAnimation />
      <p className="mt-4 text-gray-600"></p>
    </div>
  );

  return (
    <div className="flex bg-background min-h-screen">
      <div className="fixed w-64">
        <Sidebar />
      </div>

      <div className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Home - Leadership Section</h2>
          <p className="mt-2 text-gray-600">Manage Leadership content in multiple languages</p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-3xl font-bold text-gray-800">
              {leadershipData.heading.en}
            </h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg flex items-center gap-2"
            >
              {isEditing ? <>Cancel</> : <>Edit</>}
            </button>
            
          </div>

          {isEditing ? (
            <EditLeadership
              leadershipData={leadershipData}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              <h4 className="text-xl  text-gray-600">
              {leadershipData.title.en}
            </h4>
              <p className="text-gray-600 mt-4 leading-relaxed">
                {leadershipData.description.en}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {leadershipData.leaders.map((leader) => (
                  <li
                    key={leader.id}
                    className="border rounded-lg shadow overflow-hidden relative"
                    style={{ height: "350px" }}
                  >
                    <img
                      src={leader.imagePath}
                      alt={leader.name.en}
                      className="w-full h-350px object-cover"
                      style={{ height: "350px" }}
                    />
                    <div className="absolute inset-0 flex place-items-end pb-5 justify-center bg-black/50">
                      <div className="text-center">
                        <h2 className="text-xl font-semibold text-white">
                          {leader.name.en}
                        </h2>
                        <h3 className="text-lg font-medium text-white mt-1">
                          {leader.role.en}
                        </h3>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadershipPage;