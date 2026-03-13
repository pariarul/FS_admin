module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7EDE2",
        foreground: "#f5f5f5",
        primary: "#1d1e4d",
        secondary: "#8153FC",
        text: {
          DEFAULT: "#242E49",  
          light: "#ffffff",    
        },
        icon: {
          light: "#A0AEC0", 
        },
      },
    },
  },
  plugins: [],
}
