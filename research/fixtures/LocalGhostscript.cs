using System;
using System.Runtime.InteropServices;
class LocalGhostscript {
 const string Dll = @"C:\Program Files (x86)\InPage\InPage 3 Professional\gsdll32.dll";
 [DllImport(Dll,CallingConvention=CallingConvention.StdCall)] static extern int gsapi_new_instance(out IntPtr instance,IntPtr handle);
 [DllImport(Dll,CallingConvention=CallingConvention.StdCall)] static extern int gsapi_init_with_args(IntPtr instance,int argc,[MarshalAs(UnmanagedType.LPArray,ArraySubType=UnmanagedType.LPStr)] string[] argv);
 [DllImport(Dll,CallingConvention=CallingConvention.StdCall)] static extern int gsapi_exit(IntPtr instance);
 [DllImport(Dll,CallingConvention=CallingConvention.StdCall)] static extern void gsapi_delete_instance(IntPtr instance);
 static int Main(string[] input) {
  if(input.Length!=2)return 2;
  IntPtr gs;int result=gsapi_new_instance(out gs,IntPtr.Zero);if(result<0)return result;
  var args=new[]{"inpage-net-eps-check","-dSAFER","-dBATCH","-dNOPAUSE","-dEPSCrop","-sDEVICE=png16m","-r96","-sOutputFile="+input[1],input[0]};
  try {result=gsapi_init_with_args(gs,args.Length,args);gsapi_exit(gs);Console.WriteLine("Ghostscript result: "+result);return result==0||result==-101?0:1;}finally{gsapi_delete_instance(gs);}
 }
}
