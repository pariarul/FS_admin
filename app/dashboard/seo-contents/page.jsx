import React from 'react';
import Sidebar from '../components/Sidebar';

import HomeSeo from './home/HomeSEO';
import CompanySEO from './company/CompanySEO';
import HistorySEO from './history/HistorySEO';
import LeadershipsSEO from './leaderships/LeadershipsSEO';
import FounderSEO from './founder/FounderSEO';
import CoFounderSEO from './co-founder/CoFounderSEO';
import ProductsSEO from './products/ProductsSEO';
import PrivacyPolicySEO from './privacy-policy/PrivacyPolicySEO';
import TermsConditionsSEO from './terms-conditions/TermsConditionsSEO';
import SuppliersSEO from './suppliers/SuppliersSEO';

const Page = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      
      {/* Sidebar */}
      <aside className="fixed h-screen w-64 shadow-xl">
        <Sidebar />
      </aside>

      {/* Content */}
      <main className=" flex-1 p-6 space-y-6 ">
        <HomeSeo />
        <CompanySEO />
        <HistorySEO />
        <LeadershipsSEO />
        <FounderSEO />
        <CoFounderSEO />
        <ProductsSEO />
        <PrivacyPolicySEO />
        <TermsConditionsSEO />
        <SuppliersSEO />
      </main>

    </div>
  );
};

export default Page;
