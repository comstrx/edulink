import { Route, Navigate } from "react-router-dom";
import Home from "@/pages/public/Home";
import JobsHub from "@/pages/public/JobsHub";
import JobDetails from "@/pages/public/JobDetails";
import SchoolsDiscovery from "@/pages/public/SchoolsDiscovery";
import JobsByRegion from "@/pages/public/JobsByRegion";
import ESLJobs from "@/pages/public/ESLJobs";
import TrainingHub from "@/pages/public/TrainingHub";
import Courses from "@/pages/public/Courses";
import Packages from "@/pages/public/Packages";
import Pathways from "@/pages/public/Pathways";
import TrainingForSchools from "@/pages/public/TrainingForSchools";
import TrainingCredentials from "@/pages/public/TrainingCredentials";
import TrainingMentors from "@/pages/public/TrainingMentors";
import TrainingForTeachers from "@/pages/public/TrainingForTeachers";
import TrainingDetail from "@/pages/public/TrainingDetail";
import CredentialVerify from "@/pages/public/CredentialVerify";
import SchoolProfile from "@/pages/public/SchoolProfile";
import Pricing from "@/pages/public/Pricing";
import TeacherPublicProfile from "@/pages/public/TeacherProfile";
import Hire from "@/pages/public/Hire";
import PostAJob from "@/pages/public/PostAJob";
import PublicTalentSearch from "@/pages/public/PublicTalentSearch";
import HireTeachersLanding from "@/pages/public/HireTeachersLanding";
import ForTeachers from "@/pages/public/ForTeachers";
import ForSchools from "@/pages/public/ForSchools";
import About from "@/pages/public/About";
import Contact from "@/pages/public/Contact";
import Help from "@/pages/public/Help";
import Privacy from "@/pages/public/Privacy";
import Terms from "@/pages/public/Terms";
import Login from "@/pages/public/Login";
import Signup from "@/pages/public/Signup";
import ForgotPassword from "@/pages/public/ForgotPassword";
import ResetPassword from "@/pages/public/ResetPassword";
import ProviderProfile from "@/pages/public/ProviderProfile";
import ProvidersDirectory from "@/pages/public/ProvidersDirectory";
import MentorsDirectory from "@/pages/public/MentorsDirectory";
import MentorProfile from "@/pages/public/MentorProfile";

export const publicRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/jobs" element={<JobsHub />} />
    <Route path="/jobs/:id" element={<JobDetails />} />
    <Route path="/schools" element={<SchoolsDiscovery />} />
    <Route path="/jobs/schools" element={<Navigate to="/schools" replace />} />
    <Route path="/jobs/regions" element={<JobsByRegion />} />
    <Route path="/jobs/esl" element={<ESLJobs />} />
    <Route path="/training" element={<TrainingHub />} />
    <Route path="/training/courses" element={<Courses />} />
    <Route path="/training/packages" element={<Packages />} />
    <Route path="/training/pathways" element={<Pathways />} />
    <Route path="/training/credentials" element={<TrainingCredentials />} />
    <Route path="/training/certifications" element={<Navigate to="/training/credentials" replace />} />
    <Route path="/credentials/verify/:verificationCode" element={<CredentialVerify />} />
    <Route path="/training/mentors" element={<TrainingMentors />} />
    <Route path="/training/for-teachers" element={<TrainingForTeachers />} />
    <Route path="/training/for-schools" element={<TrainingForSchools />} />
    <Route path="/training/:slug" element={<TrainingDetail />} />
    <Route path="/schools/:id" element={<SchoolProfile />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/talent-search" element={<PublicTalentSearch />} />
    <Route path="/hire/talent-search" element={<Navigate to="/talent-search" replace />} />
    <Route path="/hire" element={<Hire />} />
    <Route path="/hire/post-a-job" element={<PostAJob />} />
    <Route path="/hire/teachers" element={<HireTeachersLanding variant="overview" />} />
    <Route path="/hire/teachers/esl" element={<HireTeachersLanding variant="esl" />} />
    <Route path="/hire/teachers/british-curriculum" element={<HireTeachersLanding variant="british" />} />
    <Route path="/hire/teachers/ib" element={<HireTeachersLanding variant="ib" />} />
    <Route path="/teachers/:id" element={<TeacherPublicProfile />} />
    <Route path="/for-teachers" element={<ForTeachers />} />
    <Route path="/for-schools" element={<ForSchools />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/help" element={<Help />} />
    <Route path="/providers" element={<ProvidersDirectory />} />
    <Route path="/providers/:slug" element={<ProviderProfile />} />
    <Route path="/mentors" element={<MentorsDirectory />} />
    <Route path="/mentors/:id" element={<MentorProfile />} />
    <Route path="/privacy" element={<Privacy />} />
    <Route path="/terms" element={<Terms />} />
  </>
);
